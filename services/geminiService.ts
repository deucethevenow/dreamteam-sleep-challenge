import { GoogleGenerativeAI } from "@google/generative-ai";

let ai: GoogleGenerativeAI | null = null;

// Initialize safely
try {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    ai = new GoogleGenerativeAI(process.env.API_KEY);
  }
} catch (error) {
  console.warn("Gemini API Key not found or invalid.");
}

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
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Generate a short, witty, and science-backed sleep tip (max 1 sentence) for someone
      who logged ${currentHours.toFixed(1)} hours of sleep today.
      If hours are low (<6), be encouraging about improving sleep.
      If hours are good (7-9), celebrate and offer maintenance tips.
      If hours are high (>9), gently remind about oversleeping risks.
      Include one relevant emoji.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Every hour of quality sleep is an investment in tomorrow! 🌙";
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
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
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
    return "🌟 Every hour of sleep makes you stronger, smarter, and happier!";
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
    const model = ai.getGenerativeModel({ model: "gemini-pro" });
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
