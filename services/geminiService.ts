import { GoogleGenerativeAI } from "@google/generative-ai";

let ai: GoogleGenerativeAI | null = null;

// Initialize safely — try Vite's import.meta.env first (proper client-side pattern),
// then fall back to process.env.API_KEY (for production/server builds)
try {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY
    || (typeof process !== 'undefined' && process.env?.API_KEY);
  if (apiKey) {
    ai = new GoogleGenerativeAI(apiKey);
  }
} catch (error) {
  console.warn("Gemini API Key not found or invalid.");
}

// --- AI Screenshot Analysis Types ---
export interface ExtractedSleepData {
  // Core sleep duration
  totalSleepHours?: number;      // Total sleep time in hours (decimal)
  totalSleepMinutes?: number;    // Total sleep time in minutes (alternative)
  
  // Sleep score
  sleepScore?: number;           // 0-100 composite score
  
  // Sleep timing
  bedtime?: string;              // HH:MM format (24hr)
  wakeTime?: string;             // HH:MM format (24hr)
  
  // Sleep stages (in minutes)
  deepSleepMin?: number;
  remSleepMin?: number;
  lightSleepMin?: number;
  awakeMin?: number;
  
  // Quality metrics
  sleepEfficiency?: number;      // % (0-100)
  sleepLatencyMin?: number;      // Time to fall asleep in minutes
  
  // Source detection
  detectedSource?: 'eight_sleep' | 'oura' | 'apple_watch' | 'fitbit' | 'whoop' | 'garmin' | 'unknown';
  
  // Confidence score (0-1)
  confidence?: number;
  
  // Raw text extracted (for debugging)
  rawExtractedText?: string;
}

export interface ScreenshotAnalysisResult {
  success: boolean;
  data: ExtractedSleepData;
  errors?: string[];
  warnings?: string[];
}

// Detect Gemini quota / rate limit errors
function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('429') || msg.includes('quota') || msg.includes('rate') || msg.includes('RESOURCE_EXHAUSTED');
}

// Convert File to base64 for Gemini Vision API
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Analyze sleep screenshots using Gemini Vision
export const analyzeSleepScreenshots = async (files: File[]): Promise<ScreenshotAnalysisResult> => {
  if (!files || files.length === 0) {
    return {
      success: false,
      data: {},
      errors: ['No files provided']
    };
  }

  // Check if Gemini is available - try to initialize from window config if not
  if (!ai) {
    // Try to get API key from window config (client-side)
    const windowConfig = (window as any).__GEMINI_API_KEY__;
    if (windowConfig) {
      ai = new GoogleGenerativeAI(windowConfig);
    }
  }

  if (!ai) {
    return {
      success: false,
      data: {},
      errors: ['AI service not available. Please enter data manually.']
    };
  }

  try {
    // Use gemini-2.0-flash for vision tasks (faster and cheaper)
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Convert all files to base64 image parts
    const imageParts = await Promise.all(
      files.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          inlineData: {
            data: base64,
            mimeType: file.type || 'image/png'
          }
        };
      })
    );

    const prompt = `Analyze these sleep tracker screenshots and extract all sleep data. 
The images may be from Eight Sleep, Apple Watch, Oura Ring, Fitbit, Whoop, Garmin, or other sleep trackers.

Extract the following data if visible (use null if not found):

1. **Total Sleep Time**: Look for "Total sleep", "Time asleep", "Sleep duration" - convert to hours (decimal) and minutes
2. **Sleep Score**: Look for any 0-100 score labeled "Sleep score", "Sleep rating", "Sleep quality score"
3. **Bedtime**: When the person went to bed (HH:MM in 24hr format, e.g., "22:30")
4. **Wake Time**: When the person woke up (HH:MM in 24hr format, e.g., "06:45")
5. **Deep Sleep**: Minutes of deep/slow wave sleep (often shown in purple/dark blue)
6. **REM Sleep**: Minutes of REM sleep (often shown in light blue/cyan)
7. **Light Sleep**: Minutes of light sleep (often shown in light colors)
8. **Awake Time**: Minutes awake during the night
9. **Sleep Efficiency**: Percentage of time in bed actually sleeping
10. **Sleep Latency**: Minutes to fall asleep (time from bed to asleep)

Also identify which app/device the screenshot is from.

IMPORTANT: Be thorough and look at ALL images provided. Combine data from multiple screenshots if they show different metrics.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "totalSleepHours": <number or null>,
  "totalSleepMinutes": <number or null>,
  "sleepScore": <number 0-100 or null>,
  "bedtime": "<HH:MM string or null>",
  "wakeTime": "<HH:MM string or null>",
  "deepSleepMin": <number or null>,
  "remSleepMin": <number or null>,
  "lightSleepMin": <number or null>,
  "awakeMin": <number or null>,
  "sleepEfficiency": <number 0-100 or null>,
  "sleepLatencyMin": <number or null>,
  "detectedSource": "<eight_sleep|oura|apple_watch|fitbit|whoop|garmin|unknown>",
  "confidence": <number 0-1 representing extraction confidence>,
  "rawExtractedText": "<brief summary of key text found>"
}`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().trim();

    // Parse the JSON response
    // Clean up common issues - remove markdown code blocks if present
    let cleanedText = text;
    if (text.startsWith('```')) {
      cleanedText = text.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }

    try {
      const extractedData: ExtractedSleepData = JSON.parse(cleanedText);
      
      // Validate and clean the data
      const warnings: string[] = [];
      
      // If we have minutes but not hours, calculate hours
      if (extractedData.totalSleepMinutes && !extractedData.totalSleepHours) {
        extractedData.totalSleepHours = Math.round((extractedData.totalSleepMinutes / 60) * 100) / 100;
      }
      
      // Validate sleep score is in range
      if (extractedData.sleepScore !== undefined && extractedData.sleepScore !== null) {
        if (extractedData.sleepScore < 0 || extractedData.sleepScore > 100) {
          warnings.push('Sleep score was outside 0-100 range, may be inaccurate');
        }
      }
      
      // Validate times
      if (extractedData.bedtime && !/^\d{2}:\d{2}$/.test(extractedData.bedtime)) {
        warnings.push('Bedtime format may be incorrect');
      }
      if (extractedData.wakeTime && !/^\d{2}:\d{2}$/.test(extractedData.wakeTime)) {
        warnings.push('Wake time format may be incorrect');
      }

      return {
        success: true,
        data: extractedData,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      return {
        success: false,
        data: {},
        errors: ['Failed to parse AI response. Please try again or enter data manually.'],
      };
    }
  } catch (error) {
    console.error("Gemini Vision API Error:", error);

    const friendlyMessage = isQuotaError(error)
      ? "Our AI is sleeping on the job right now (quota limit reached). Please enter your data manually — we'll wake it up soon! 😴"
      : "AI analysis hit a snag. Please enter your data manually.";

    return {
      success: false,
      data: {},
      errors: [friendlyMessage]
    };
  }
};

export const getSleepTip = async (currentHours: number): Promise<string> => {
  if (!ai) {
    // Fallback sleep tips
    const fallbacks = [
      "Your bedroom should be a cave: cool, dark, and quiet! 🌙",
      "Consistency is key - same bedtime, same wake time, even on weekends! ⏰",
      "Blue light blocks melatonin. Put that phone away an hour before bed! 📵",
      "A cool room (65-68°F) helps trigger sleep onset. 🌡️",
      "Caffeine has a 6-hour half-life. Switch to herbal tea after lunch! ☕",
      "Deep breathing activates your parasympathetic nervous system. Try 4-7-8 breathing! 🧘",
      "Exercise is great for sleep, but finish 3+ hours before bed! 💪",
      "A warm bath before bed causes a temperature drop that triggers sleepiness! 🛁"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const hours = currentHours.toFixed(1);
    const prompt = "This person logged " + hours + " hours of sleep. " +
      "Give them ONE short, witty, science-backed sleep tip (1-2 sentences max). " +
      "Be specific to their hours — do NOT list multiple scenarios. " +
      "Do NOT use markdown formatting (no asterisks, no bold, no bullet points). " +
      "Include one relevant emoji. Just the tip, nothing else.";

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return isQuotaError(error)
      ? "Our AI tip generator is sleeping on the job (quota reached). Here's a classic: keep your bedroom cool (65-68°F) for optimal sleep! 🌡️"
      : "Every hour of quality sleep is an investment in tomorrow! 🌙";
  }
};

// Keep old function name for backward compatibility
export const getHealthTip = getSleepTip;

export const getDailyFunFact = async (todayHours: number, totalHours: number, leadingTeamName: string): Promise<string> => {
  if (!ai) {
    // Fallback fun facts about sleep
    const fallbacks = [
      "🧠 During deep sleep, your brain literally washes away toxins that build up during the day!",
      "💭 On average, you'll dream about 6 years of your life - that's a lot of adventure!",
      "🐨 Koalas sleep 22 hours a day. You're doing great by comparison!",
      "🌙 The record for longest time without sleep is 264 hours - please don't try this!",
      "✨ Growth hormone is released during sleep - you literally grow while you rest!",
      "🧬 Poor sleep can change gene expression in just one week. Prioritize your rest!",
      "🎯 After 17 hours without sleep, your performance equals having a 0.05% BAC!",
      "💪 Sleep deprivation costs US companies $411 billion annually. Rest is productive!"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
      Generate ONE fun, witty, or surprising fact about today's team sleep challenge activity.

      Context:
      - Today the team logged ${todayHours.toFixed(1)} hours of sleep collectively
      - Total lifetime sleep hours: ${totalHours.toFixed(1)}
      - Leading team: ${leadingTeamName}

      Make it:
      - Short (1-2 sentences max)
      - Include a surprising sleep science fact or fun comparison
      - Celebratory and positive about good sleep habits
      - Include ONE relevant emoji
      - Make it relatable and fun

      Examples:
      - "🧠 Your ${totalHours.toFixed(1)} hours of sleep have processed enough memories to fill a novel!"
      - "🦉 ${leadingTeamName} is sleeping like owls - but healthier, during the night!"
      - "💭 With ${totalHours.toFixed(1)} collective sleep hours, you've had approximately ${Math.round(totalHours * 4)} dreams!"

      Return ONLY the fun fact, nothing else.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return isQuotaError(error)
      ? "😴 Fun fact: Even our AI needs sleep sometimes! It hit its quota limit — but unlike humans, it'll bounce back in a few hours."
      : "🌟 Every hour of sleep makes you stronger, smarter, and happier!";
  }
};

// --- Personalized AI Sleep Analysis ---

export interface SleepAnalysisInput {
  username: string;
  weekLogs: {
    date: string;
    hours: number;
    bedtime: string;
    wakeTime: string;
    quality?: number;
    sleepScore?: number;
    deepSleepMin?: number;
    remSleepMin?: number;
    sleepEfficiency?: number;
  }[];
  avgHours: number;
  consistencyVariation: number; // minutes
  compositeScore: number;
  previousWeekAvgHours?: number;
}

export interface SleepAnalysisResult {
  summary: string;
  highlights: { metric: string; detail: string }[];
  tip: string;
}

export const getPersonalizedSleepAnalysis = async (
  input: SleepAnalysisInput
): Promise<SleepAnalysisResult> => {
  const fallback: SleepAnalysisResult = {
    summary: "Keep logging to unlock your personalized sleep briefing! We need at least a few nights of data to spot patterns.",
    highlights: [{ metric: "Getting Started", detail: "Log a few more nights and we'll analyze your sleep patterns, trends, and give you personalized tips." }],
    tip: "Consistency is the #1 predictor of sleep quality — try keeping the same bedtime within 30 minutes every night."
  };

  if (!ai || input.weekLogs.length < 2) {
    return fallback;
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build data summary for prompt
    const logSummary = input.weekLogs.map(l => {
      let line = l.date + ": " + l.hours.toFixed(1) + "h, bed " + l.bedtime + ", wake " + l.wakeTime;
      if (l.quality) line += ", quality " + l.quality + "/5";
      if (l.sleepScore) line += ", score " + l.sleepScore;
      if (l.deepSleepMin) line += ", deep " + l.deepSleepMin + "min";
      if (l.remSleepMin) line += ", REM " + l.remSleepMin + "min";
      if (l.sleepEfficiency) line += ", efficiency " + l.sleepEfficiency + "%";
      return line;
    }).join("\n");

    const trendNote = input.previousWeekAvgHours
      ? "Previous week average: " + input.previousWeekAvgHours.toFixed(1) + "h/night. " +
        (input.avgHours > input.previousWeekAvgHours ? "Trend: IMPROVING" : "Trend: DECLINING")
      : "No previous week data for comparison.";

    const prompt = "You are a friendly sleep analyst writing a brief morning-style sleep briefing for " + input.username + ". " +
      "Think Eight Sleep morning messages — warm, data-driven, insightful. NOT a report card or lecture.\n\n" +
      "SLEEP DATA:\n" + logSummary + "\n\n" +
      "SUMMARY STATS:\n" +
      "- Average: " + input.avgHours.toFixed(1) + "h/night\n" +
      "- Bedtime consistency: ±" + Math.round(input.consistencyVariation) + " min variation\n" +
      "- Composite sleep score: " + input.compositeScore + "/100\n" +
      "- " + trendNote + "\n\n" +
      "STYLE GUIDE:\n" +
      "- Write like a smart friend who understands sleep science, not a doctor or teacher.\n" +
      "- Reference their actual numbers — comparisons between nights, changes, and what's notable.\n" +
      "- Explain WHY things matter: 'Deep sleep up to 21% — that's your body doing physical repair.'\n" +
      "- Keep tips specific and behavioral: 'Try dimming lights at 9:30 PM' not 'improve your sleep hygiene.'\n" +
      "- Tone: warm, concise, informative. Like a text from a knowledgeable friend.\n" +
      "- 2-3 highlights max. Don't list everything — pick what's most interesting or notable.\n\n" +
      "EXAMPLE of the tone and style we want (from Eight Sleep):\n" +
      "'Last night's sleep score held at 83 with deep sleep up to 21%, aiding physical repair. " +
      "REM dropped to 17%, below your 24% baseline, while sleep interruptions increased. " +
      "This unusual split may affect mental restoration tonight.'\n\n" +
      "Return ONLY valid JSON (no markdown, no explanation):\n" +
      '{\n' +
      '  "summary": "2-3 sentence briefing analyzing their metrics — what happened, why it matters, what to watch. Reference specific numbers and compare between nights if possible.",\n' +
      '  "highlights": [\n' +
      '    {"metric": "short label like Deep Sleep or Duration", "detail": "what happened with this metric and why it matters — 1 sentence"}\n' +
      '  ],\n' +
      '  "tip": "One specific, behavioral suggestion tied to their data. Not a goal — an action. Example: Try reading instead of screens after 10 PM to help with that 16-min sleep latency."\n' +
      '}';

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Clean markdown code blocks
    let cleaned = text;
    if (text.startsWith('```')) {
      cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }

    const parsed: SleepAnalysisResult = JSON.parse(cleaned);

    // Validate required fields
    if (!parsed.summary || !parsed.highlights || !parsed.tip) {
      console.warn("Gemini sleep analysis missing fields, using fallback");
      return fallback;
    }

    return parsed;
  } catch (error) {
    console.error("Gemini Sleep Analysis Error:", error);
    if (isQuotaError(error)) {
      return {
        summary: "Our AI sleep analyst called in sick today (hit its quota limit). Check back later for your personalized briefing!",
        highlights: [{ metric: "AI Napping", detail: "The analysis engine exceeded its API quota. It'll be back after a good rest." }],
        tip: "While our AI recharges, here's a timeless one: keep your bedtime consistent within 30 minutes every night — it's the #1 predictor of sleep quality."
      };
    }
    return fallback;
  }
};

export const getMorningMotivation = async (winnerName: string, winnerHours: number, totalWins: number): Promise<string> => {
  if (!ai) {
    // Fallback motivations
    const fallbacks = [
      `${winnerName} showed us what rest looks like! Tonight's sleep crown is up for grabs - who's taking it? 👑`,
      `Congrats to ${winnerName} for last night's epic sleep! The competition is heating up! 🔥`,
      `${winnerHours.toFixed(1)} hours is no joke! Can anyone match that rest tonight? 💪`,
      `${winnerName} is on fire! But remember - every night is a new chance to claim the crown! ✨`,
      `Last night's winner: ${winnerName}. Tonight's champion: Could be YOU! Let's rest! 🚀`
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
      Generate a short, energizing morning motivation message for a team sleep challenge.

      Context:
      - Last night's top sleeper: ${winnerName}
      - Their sleep hours: ${winnerHours.toFixed(1)} hours
      - Total nightly wins for this person: ${totalWins}

      Make it:
      - 1-2 sentences max
      - Celebratory of the winner but also motivating for everyone else
      - Playful and competitive in a friendly way
      - Include ONE emoji at the start or end
      ${totalWins > 1 ? `- Mention they're on a winning streak (${totalWins} wins!)` : '- Mention it was their first win'}

      Examples of good tone:
      - "${winnerName} is building a sleep dynasty! But dynasties can fall... Who's resting up tonight? 👑"
      - "That's ${totalWins} crowns for ${winnerName}! The throne is getting warm - time to cool it down! 🔥"

      Return ONLY the motivation message, nothing else.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `${winnerName} crushed it last night! Tonight's crown is up for grabs - let's see who wants it! 🏆`;
  }
};
