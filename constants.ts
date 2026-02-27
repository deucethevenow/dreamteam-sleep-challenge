import { Team, Badge, DailyQuest, BonusActivity } from './types';

export const APP_NAME = "dreamteam";
export const DAILY_GOAL = 7.5; // 7.5 hours — aligned with 5 complete 90-min sleep cycles (AASM/NSF)
export const DAYS_IN_MONTH = 31;

export const CHALLENGE_START = '2026-03-01'; // Challenge start date
export const CHALLENGE_END = '2026-03-31';   // Challenge end date
export const PARTICIPANT_COUNT = 10;

// 10 Users * 7.5 hours * 31 Days = 2,325 hours
export const GLOBAL_GOAL = 10 * DAILY_GOAL * DAYS_IN_MONTH;

// 7.5h * 31 days = 232.5 hours per person
export const TEAM_AVG_GOAL = DAILY_GOAL * DAYS_IN_MONTH;

// Weekly Logic
export const WEEKLY_GOAL = DAILY_GOAL * 7; // 52.5 hours
export const RAFFLE_THRESHOLD_PCT = 0.6; // 60%
export const RAFFLE_THRESHOLD_HOURS = WEEKLY_GOAL * RAFFLE_THRESHOLD_PCT; // 31.5 hours

// Grand Prize Logic (Monthly)
export const MONTHLY_INDIVIDUAL_GOAL = DAILY_GOAL * DAYS_IN_MONTH;
export const GRAND_PRIZE_THRESHOLD_PCT = 0.7; // 70%
export const GRAND_PRIZE_THRESHOLD_HOURS = MONTHLY_INDIVIDUAL_GOAL * GRAND_PRIZE_THRESHOLD_PCT; // 162.75 hours

export const INITIAL_TEAMS: Team[] = [
  { id: 1, name: "The Night Owls", color_hex: "from-indigo-400 to-purple-500", icon: "🦉" },
  { id: 2, name: "The Dream Chasers", color_hex: "from-violet-400 to-pink-400", icon: "✨" },
];

export const INITIAL_USERS = [
  // Team 1
  { id: 1, username: "Pam", team_id: 1, avatar_emoji: "🧘‍♀️", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 2, username: "Victoria", team_id: 1, avatar_emoji: "🌙", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 3, username: "Jack", team_id: 1, avatar_emoji: "😴", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 4, username: "Francisco", team_id: 1, avatar_emoji: "💤", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  
  // Team 2
  { id: 5, username: "Claire", team_id: 2, avatar_emoji: "🌟", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 6, username: "Deuce", team_id: 2, avatar_emoji: "🧢", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 7, username: "Courtney", team_id: 2, avatar_emoji: "🛏️", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 8, username: "Arb", team_id: 2, avatar_emoji: "🕶️", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
];

// Sleep-themed journey milestones
export const MILESTONES = [
  { hours: 0, label: "Recess HQ (Wide Awake)" },
  { hours: 465, label: "Cozy Cabin in the Woods" },       // 20%
  { hours: 930, label: "Zen Meditation Retreat" },          // 40%
  { hours: 1395, label: "Cloud Nine Sanctuary" },           // 60%
  { hours: 1860, label: "Aurora Borealis Dreamland" },      // 80%
  { hours: 2325, label: "Hibernation Hall of Fame" },       // 100%
];

// Sleep conversion rates for fun stats
export const CONVERSION_RATES = {
  DREAMS_PER_HOUR: 4, // Average 4-6 dreams per night (8 hours)
  MEMORY_CONSOLIDATION_CYCLES: 0.125, // ~1 per 8 hours (full sleep cycle)
  MELATONIN_BOOST: 0.5, // Arbitrary wellness unit per hour
  ENERGY_RESTORED: 12.5, // % of energy restored per hour
};

export const BADGES: Badge[] = [
  { id: 'streak_3', label: 'Sleep Champion', icon: '🏆', description: 'Hit 8+ hours 3 nights in a row', earned: false },
  { id: 'early_sleeper', label: 'Early Bird', icon: '🌅', description: 'In bed before 10pm', earned: false },
  { id: 'quality_king', label: 'Quality King', icon: '👑', description: 'Logged 5-star sleep quality', earned: false },
  { id: 'weekend', label: 'Weekend Warrior', icon: '🎉', description: 'Great sleep on Saturday/Sunday', earned: false },
  { id: 'deep_sleeper', label: 'Deep Sleeper', icon: '💎', description: '9+ hours in one night', earned: false },
  { id: 'daily_winner', label: 'Nightly Champion', icon: '🌙', description: 'Most sleep in a single night', earned: false },
];

export const BONUS_ACTIVITIES: BonusActivity[] = [
  { 
    type: 'Bonus: No Caffeine', 
    label: 'No Caffeine After 2pm', 
    hours: 1, 
    description: 'Caffeine-free evenings lead to deeper sleep.',
    icon: 'Coffee'
  },
  { 
    type: 'Bonus: Wind-down', 
    label: 'Wind-down Routine', 
    hours: 0.5, 
    description: 'Relaxing activities before bed (reading, stretching).',
    icon: 'BookOpen' 
  },
  { 
    type: 'Bonus: No Screens', 
    label: 'No Screens 1hr Before', 
    hours: 0.5, 
    description: 'Blue light-free for better melatonin production.',
    icon: 'MonitorOff' 
  },
  { 
    type: 'Bonus: Cool Room', 
    label: 'Room Temp 65-68°F', 
    hours: 0.5, 
    description: 'Optimal temperature for quality sleep.',
    icon: 'Thermometer' 
  },
  { 
    type: 'Bonus: Meditation', 
    label: 'Meditation Before Bed', 
    hours: 0.5, 
    description: 'Calm the mind for faster sleep onset.',
    icon: 'Brain' 
  },
  { 
    type: 'Bonus: Exercise', 
    label: 'Exercise Today', 
    hours: 0.5, 
    description: 'Physical activity promotes better sleep.',
    icon: 'Dumbbell' 
  },
  { 
    type: 'Bonus: Gratitude', 
    label: 'Gratitude Journal', 
    hours: 0.25, 
    description: 'Positive thoughts reduce sleep anxiety.',
    icon: 'Heart' 
  },
  { 
    type: 'Bonus: Hydration', 
    label: 'Proper Hydration', 
    hours: 0.25, 
    description: 'Well-hydrated body sleeps better (but not too close to bed!).',
    icon: 'Droplets' 
  },
];

export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'q1', label: 'Early Riser', description: 'Log 8+ hours ending before 7am', icon: '🌅', targetValue: 8 },
  { id: 'q2', label: 'Consistent Sleeper', description: 'Same bedtime as yesterday (±30min)', icon: '⏰', targetValue: 8 },
  { id: 'q3', label: 'Quality Quest', description: 'Log sleep with 4+ quality rating', icon: '⭐', targetValue: 4 },
  { id: 'q4', label: 'Weekend Rest', description: 'Get extra rest on Sat or Sun', icon: '🛋️', targetValue: 9 },
  { id: 'q5', label: 'Perfect Night', description: 'Hit exactly 8 hours of sleep', icon: '🎯', targetValue: 8 },
];

// --- Helper Functions ---

export const calculateMetrics = (hours: number) => {
  return {
    dreams: Math.round(hours * CONVERSION_RATES.DREAMS_PER_HOUR),
    cycles: Math.round(hours / 1.5), // Sleep cycles are ~90 min
    energyRestored: Math.round(hours * CONVERSION_RATES.ENERGY_RESTORED),
    minutes: Math.round(hours * 60),
    days: Math.round((hours / 24) * 10) / 10, // days equivalent, 1 decimal
    percentOfLife: Math.round((hours / (24 * DAYS_IN_MONTH)) * 1000) / 10, // % of month spent sleeping
  };
};

export const getFunInsight = (totalHours: number) => {
  const days = totalHours / 24;
  const weeks = days / 7;

  if (weeks >= 4) return "You've slept a full month of nights! 🌙 Legendary!";
  if (days >= 14) return "That's two weeks of solid sleep! You're a rest champion! 🏆";
  if (days >= 7) return "A full week of sleep logged! Keep dreaming big! ✨";
  if (days >= 3) return "Three days of restorative rest! Your body thanks you! 💪";
  if (totalHours >= 40) return "You've slept as long as a work week! Rest > hustle! 😴";
  if (totalHours >= 24) return "24 hours of sleep - that's a hibernating bear's power nap! 🐻";
  if (totalHours >= 16) return "16 hours! Like a well-rested koala! 🐨";
  if (totalHours >= 8) return "Your first full night logged! Sweet dreams add up! 🌟";
  return "Every hour of sleep is an hour invested in tomorrow! 💫";
};

export const getDetailedImpact = (totalHours: number) => {
  const cycles = Math.round(totalHours / 1.5);
  const dreams = Math.round(totalHours * CONVERSION_RATES.DREAMS_PER_HOUR);
  const energyRestored = Math.round(totalHours * CONVERSION_RATES.ENERGY_RESTORED);

  return [
    { label: "Sleep Cycles", value: `${cycles}`, icon: "🔄", detail: "Full 90-min cycles" },
    { label: "Dreams", value: `~${dreams}`, icon: "💭", detail: "Estimated dreams" },
    { label: "Energy", value: `${Math.min(energyRestored, 100)}%`, icon: "⚡", detail: "Battery recharged" }
  ];
};

export const getTodaysQuest = (): DailyQuest => {
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  return DAILY_QUESTS[dayOfYear % DAILY_QUESTS.length];
};

export const getSleepAura = (hours: number, quality?: number) => {
  // Combine hours and quality for mood
  const effectiveScore = hours + (quality || 3) * 0.5;
  
  if (effectiveScore > 11) return { color: "from-violet-500 to-purple-600", label: "Rested", glow: "shadow-violet-200 ring-violet-100" };
  if (effectiveScore > 9) return { color: "from-indigo-400 to-blue-500", label: "Refreshed", glow: "shadow-indigo-200 ring-indigo-100" };
  if (effectiveScore > 7) return { color: "from-cyan-400 to-teal-400", label: "Okay", glow: "shadow-cyan-200 ring-cyan-100" };
  if (effectiveScore > 5) return { color: "from-amber-400 to-orange-400", label: "Tired", glow: "shadow-amber-200 ring-amber-100" };
  return { color: "from-gray-400 to-gray-500", label: "Exhausted", glow: "shadow-gray-200 ring-gray-100" };
};

// Calculate sleep hours from bedtime and wake time
export const calculateSleepHours = (bedtime: string, wakeTime: string): number => {
  const [bedH, bedM] = bedtime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  
  let bedMinutes = bedH * 60 + bedM;
  let wakeMinutes = wakeH * 60 + wakeM;
  
  // If wake time is earlier than bedtime, assume next day
  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60;
  }
  
  const diffMinutes = wakeMinutes - bedMinutes;
  return Math.round((diffMinutes / 60) * 100) / 100; // Round to 2 decimal places
};

// =============================================================================
// COMPOSITE SLEEP SCORE — Evidence-Based Benchmarks
// Sources: AASM 2015, NSF 2015, Phillips et al. 2017, Ohayon et al. 2004
// =============================================================================

export const SCORE_WEIGHTS = {
  DURATION: 0.35,
  CONSISTENCY: 0.25,
  EFFICIENCY: 0.15,
  SLEEP_STAGES: 0.15,
  LATENCY: 0.10,
};

// Duration scoring: 7.0-8.5h = full credit, caps at 9h
export const DURATION_RANGES = {
  FULL_MIN: 7.0,    // 100% credit starts here
  FULL_MAX: 8.5,    // 100% credit ends here
  PARTIAL_MIN: 6.0,  // Below this = 0%
  PARTIAL_MAX: 9.0,  // Above this = partial credit (oversleep penalty)
};

// Consistency scoring: variation in bedtime/wake time vs rolling 7-day average
export const CONSISTENCY_RANGES = {
  EXCELLENT_MIN: 30,  // <=30 min variation = 100%
  GOOD_MIN: 60,       // <=60 min = 70%
  FAIR_MIN: 90,       // <=90 min = 40%
  // >90 min = 0%
};

// Sleep efficiency: TST / TIB ratio
export const EFFICIENCY_RANGES = {
  EXCELLENT: 90,  // 90%+ = 100%
  GOOD: 85,       // 85-90% = 80%
  FAIR: 80,       // 80-85% = 50%
  // <80% = 20%
};

// Sleep stages (percentage of total sleep time)
export const STAGE_RANGES = {
  DEEP_TARGET_PCT: 15,   // 15%+ of total = full credit
  DEEP_MIN_PCT: 10,      // 10-15% = partial
  REM_TARGET_PCT: 20,    // 20%+ of total = full credit
  REM_MIN_PCT: 15,       // 15-20% = partial
};

// Sleep latency
export const LATENCY_RANGES = {
  IDEAL_MIN: 5,    // 5-20 min = 100%
  IDEAL_MAX: 20,
  WARN_MAX: 30,    // 20-30 min = 60%
  DEBT_MAX: 5,     // <5 min = 60% (sleep debt red flag)
  // >30 min = 20%
};

// Calculate duration sub-score (0-100)
export const scoreDuration = (hours: number): number => {
  if (isNaN(hours) || hours < 0) return 0;
  if (hours >= DURATION_RANGES.FULL_MIN && hours <= DURATION_RANGES.FULL_MAX) return 100;
  if (hours < DURATION_RANGES.PARTIAL_MIN) return 0;
  if (hours < DURATION_RANGES.FULL_MIN) {
    // Linear scale from PARTIAL_MIN to FULL_MIN
    return Math.round(((hours - DURATION_RANGES.PARTIAL_MIN) / (DURATION_RANGES.FULL_MIN - DURATION_RANGES.PARTIAL_MIN)) * 100);
  }
  if (hours > DURATION_RANGES.FULL_MAX && hours <= DURATION_RANGES.PARTIAL_MAX) {
    // Gentle oversleep penalty: 100 down to 70
    return Math.round(100 - ((hours - DURATION_RANGES.FULL_MAX) / (DURATION_RANGES.PARTIAL_MAX - DURATION_RANGES.FULL_MAX)) * 30);
  }
  return 70; // >9h = cap at 70
};

// Calculate consistency sub-score (0-100) from bedtime variation in minutes
// Uses linear interpolation within ranges to avoid cliff drops
export const scoreConsistency = (variationMinutes: number): number => {
  if (isNaN(variationMinutes) || variationMinutes < 0) return 0;
  if (variationMinutes <= CONSISTENCY_RANGES.EXCELLENT_MIN) return 100;
  if (variationMinutes <= CONSISTENCY_RANGES.GOOD_MIN) {
    // Linear interpolation: 100 at 30min → 70 at 60min
    const t = (variationMinutes - CONSISTENCY_RANGES.EXCELLENT_MIN) / (CONSISTENCY_RANGES.GOOD_MIN - CONSISTENCY_RANGES.EXCELLENT_MIN);
    return Math.round(100 - t * 30);
  }
  if (variationMinutes <= CONSISTENCY_RANGES.FAIR_MIN) {
    // Linear interpolation: 70 at 60min → 40 at 90min
    const t = (variationMinutes - CONSISTENCY_RANGES.GOOD_MIN) / (CONSISTENCY_RANGES.FAIR_MIN - CONSISTENCY_RANGES.GOOD_MIN);
    return Math.round(70 - t * 30);
  }
  // Gradual tail-off: 40 at 90min → 0 at 150min
  if (variationMinutes <= 150) {
    const t = (variationMinutes - CONSISTENCY_RANGES.FAIR_MIN) / (150 - CONSISTENCY_RANGES.FAIR_MIN);
    return Math.round(40 - t * 40);
  }
  return 0;
};

// Calculate efficiency sub-score (0-100)
export const scoreEfficiency = (efficiencyPct: number | undefined): number => {
  if (efficiencyPct === undefined || efficiencyPct === null) return -1; // -1 = no data
  if (efficiencyPct >= EFFICIENCY_RANGES.EXCELLENT) return 100;
  if (efficiencyPct >= EFFICIENCY_RANGES.GOOD) return 80;
  if (efficiencyPct >= EFFICIENCY_RANGES.FAIR) return 50;
  return 20;
};

// Calculate sleep stages sub-score (0-100) from deep% and REM%
export const scoreSleepStages = (deepPct: number | undefined, remPct: number | undefined): number => {
  if ((deepPct === undefined || deepPct === null) && (remPct === undefined || remPct === null)) return -1;
  let score = 0;
  let components = 0;

  if (deepPct !== undefined && deepPct !== null) {
    components++;
    if (deepPct >= STAGE_RANGES.DEEP_TARGET_PCT) score += 100;
    else if (deepPct >= STAGE_RANGES.DEEP_MIN_PCT) score += 60;
    else score += 20;
  }

  if (remPct !== undefined && remPct !== null) {
    components++;
    if (remPct >= STAGE_RANGES.REM_TARGET_PCT) score += 100;
    else if (remPct >= STAGE_RANGES.REM_MIN_PCT) score += 60;
    else score += 20;
  }

  return components > 0 ? Math.round(score / components) : -1;
};

// Calculate latency sub-score (0-100)
export const scoreLatency = (latencyMin: number | undefined): number => {
  if (latencyMin === undefined || latencyMin === null) return -1;
  if (latencyMin < LATENCY_RANGES.DEBT_MAX) return 60; // <5 min = sleep debt
  if (latencyMin <= LATENCY_RANGES.IDEAL_MAX) return 100; // 5-20 min ideal
  if (latencyMin <= LATENCY_RANGES.WARN_MAX) return 60;   // 20-30 min
  return 20; // >30 min
};

// Main composite score calculator
export interface CompositeScoreResult {
  total: number;            // 0-100 composite score
  duration: number;         // 0-100 sub-score
  consistency: number;      // 0-100 sub-score
  efficiency: number;       // 0-100 sub-score or -1 if no data
  sleepStages: number;      // 0-100 sub-score or -1 if no data
  latency: number;          // 0-100 sub-score or -1 if no data
  hasWearableData: boolean; // true if efficiency/stages/latency available
}

export const calculateCompositeScore = (
  hours: number,
  consistencyVariationMin: number,
  efficiencyPct?: number,
  deepPct?: number,
  remPct?: number,
  latencyMin?: number,
): CompositeScoreResult => {
  const durationScore = scoreDuration(hours);
  const consistencyScore = scoreConsistency(consistencyVariationMin);
  const efficiencyScore = scoreEfficiency(efficiencyPct);
  const stagesScore = scoreSleepStages(deepPct, remPct);
  const latencyScore = scoreLatency(latencyMin);

  // Determine which sub-scores have data
  const hasWearableData = efficiencyScore !== -1 || stagesScore !== -1 || latencyScore !== -1;

  let total: number;
  if (hasWearableData) {
    // Use all available dimensions with proper weighting
    let weightSum = SCORE_WEIGHTS.DURATION + SCORE_WEIGHTS.CONSISTENCY;
    let scoreSum = durationScore * SCORE_WEIGHTS.DURATION + consistencyScore * SCORE_WEIGHTS.CONSISTENCY;

    if (efficiencyScore !== -1) {
      scoreSum += efficiencyScore * SCORE_WEIGHTS.EFFICIENCY;
      weightSum += SCORE_WEIGHTS.EFFICIENCY;
    }
    if (stagesScore !== -1) {
      scoreSum += stagesScore * SCORE_WEIGHTS.SLEEP_STAGES;
      weightSum += SCORE_WEIGHTS.SLEEP_STAGES;
    }
    if (latencyScore !== -1) {
      scoreSum += latencyScore * SCORE_WEIGHTS.LATENCY;
      weightSum += SCORE_WEIGHTS.LATENCY;
    }
    total = Math.round(scoreSum / weightSum);
  } else {
    // No wearable data: redistribute to 60% duration, 40% consistency
    total = Math.round(durationScore * 0.6 + consistencyScore * 0.4);
  }

  return {
    total,
    duration: durationScore,
    consistency: consistencyScore,
    efficiency: efficiencyScore,
    sleepStages: stagesScore,
    latency: latencyScore,
    hasWearableData,
  };
};

// Calculate bedtime/wake consistency from recent logs
// Returns average variation in minutes from the user's own mean
export const calculateConsistencyVariation = (
  logs: { bedtime: string; wake_time: string; bonus_type?: string }[]
): { bedtimeVariation: number; wakeVariation: number; avgVariation: number } => {
  // Filter to actual sleep logs (not bonus), last 7 days max
  const sleepLogs = logs
    .filter(l => !l.bonus_type && l.bedtime && l.wake_time && l.bedtime !== '00:00')
    .slice(0, 7);

  if (sleepLogs.length < 2) {
    // With only 1 log, we can't measure consistency. Return a moderate default
    // (45 min variation) so users aren't rewarded with perfect consistency for a single log.
    return { bedtimeVariation: 45, wakeVariation: 45, avgVariation: 45 };
  }

  const toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    // Normalize bedtimes: treat hours 0-5 as next-day (add 24h)
    // so 23:00 = 1380, 00:30 = 1470, 01:00 = 1500
    return h < 6 ? (h + 24) * 60 + m : h * 60 + m;
  };

  const bedMinutes = sleepLogs.map(l => toMinutes(l.bedtime));
  const wakeMinutes = sleepLogs.map(l => {
    const [h, m] = l.wake_time.split(':').map(Number);
    return h * 60 + m;
  });

  const stdDev = (arr: number[]): number => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
  };

  const bedtimeVariation = Math.round(stdDev(bedMinutes));
  const wakeVariation = Math.round(stdDev(wakeMinutes));
  const avgVariation = Math.round((bedtimeVariation + wakeVariation) / 2);

  return { bedtimeVariation, wakeVariation, avgVariation };
};

// --- WEEKLY AWARDS (Computed from sleep_logs data) ---
export interface WeeklyAward {
  id: string;
  emoji: string;
  title: string;
  description: string;
  criteria: string;
  compute: 'most_total_hours' | 'most_daily_wins' | 'best_consistency' | 'best_single_night' |
           'best_sleep_score' | 'most_logs' | 'best_deep_sleep' | 'best_rem' | 'most_improved' | 'best_efficiency';
}

export const WEEKLY_AWARDS: WeeklyAward[] = [
  {
    id: 'sleep_champion', emoji: '🏆', title: 'Sleep Champion',
    description: 'Most total sleep hours',
    criteria: 'Highest total banked_hours in the period',
    compute: 'most_total_hours',
  },
  {
    id: 'crown_collector', emoji: '👑', title: 'Crown Collector',
    description: 'Most daily top-sleeper wins',
    criteria: 'Most days with the highest sleep hours',
    compute: 'most_daily_wins',
  },
  {
    id: 'clockwork', emoji: '🎯', title: 'Clockwork',
    description: 'Most consistent bedtime/wake time',
    criteria: 'Lowest standard deviation of bed and wake times',
    compute: 'best_consistency',
  },
  {
    id: 'power_sleeper', emoji: '⚡', title: 'Power Sleeper',
    description: 'Longest single sleep session',
    criteria: 'Highest sleep_hours in a single log (non-bonus)',
    compute: 'best_single_night',
  },
  {
    id: 'quality_royalty', emoji: '💎', title: 'Quality King/Queen',
    description: 'Highest average sleep score',
    criteria: 'Highest average sleep_score from wearable data',
    compute: 'best_sleep_score',
  },
  {
    id: 'engagement_champion', emoji: '📝', title: 'Engagement Champion',
    description: 'Most sleep logs submitted',
    criteria: 'Highest count of sleep_logs entries',
    compute: 'most_logs',
  },
  {
    id: 'deep_diver', emoji: '🌊', title: 'Deep Diver',
    description: 'Highest average deep sleep percentage',
    criteria: 'Best ratio of deep_sleep_min to total sleep',
    compute: 'best_deep_sleep',
  },
  {
    id: 'dream_weaver', emoji: '🌈', title: 'Dream Weaver',
    description: 'Highest average REM percentage',
    criteria: 'Best ratio of rem_sleep_min to total sleep',
    compute: 'best_rem',
  },
  {
    id: 'rising_star', emoji: '📈', title: 'Rising Star',
    description: 'Most improved week-over-week',
    criteria: 'Largest increase in average nightly sleep hours vs previous week',
    compute: 'most_improved',
  },
  {
    id: 'sleep_ninja', emoji: '🥷', title: 'Sleep Ninja',
    description: 'Highest average sleep efficiency',
    criteria: 'Best average sleep_efficiency percentage from wearable data',
    compute: 'best_efficiency',
  },
];

// --- WEEKLY PRIZES (~$100 value each) ---
export interface WeeklyPrize {
  week: number;
  title: string;
  description: string;
  value: number;
  emoji: string;
  items: string[];
}

export const WEEKLY_PRIZES: WeeklyPrize[] = [
  { 
    week: 1, 
    title: 'Hatch Restore 2', 
    description: 'The ultimate sunrise alarm clock + sound machine',
    value: 130,
    emoji: '🌅',
    items: [
      'Hatch Restore 2 Smart Sleep Assistant',
      'Sunrise alarm that wakes you naturally',
      'White noise & sleep sounds library',
      'Wind-down routines & meditations'
    ]
  },
  { 
    week: 2, 
    title: 'Total Blackout Bundle', 
    description: 'Block every photon for deeper sleep',
    value: 120,
    emoji: '🌑',
    items: [
      'Manta Sleep Mask PRO ($40)',
      'SleepPhones Wireless ($100) - Bluetooth headband',
      'This Works Deep Sleep Pillow Spray ($30)'
    ]
  },
  { 
    week: 3, 
    title: 'Recovery & Relaxation Kit', 
    description: 'Melt tension before bed',
    value: 130,
    emoji: '💆',
    items: [
      'Theragun Mini ($200) OR Hypervolt Go 2 ($130)',
      'Premium aromatherapy diffuser',
      'Lavender & eucalyptus essential oils set'
    ]
  },
  { 
    week: 4, 
    title: 'Cozy Sleep Upgrade', 
    description: 'Transform your bed into a cloud',
    value: 120,
    emoji: '☁️',
    items: [
      'Weighted blanket (15-20lb)',
      'Silk pillowcase set',
      'Premium magnesium supplement (3-month supply)',
      'Sleepytime tea collection'
    ]
  },
];

// --- GRAND PRIZE ($300 value) ---
export interface GrandPrizeOption {
  id: string;
  title: string;
  description: string;
  value: number;
  emoji: string;
  items: string[];
}

export const GRAND_PRIZE_OPTIONS: GrandPrizeOption[] = [
  {
    id: 'ultimate_sleep_setup',
    title: 'Ultimate Sleep Setup',
    description: 'Everything you need for perfect sleep',
    value: 350,
    emoji: '👑',
    items: [
      'Hatch Restore 2 ($130)',
      'Manta Sleep Mask PRO ($40)',
      'SleepPhones Wireless ($100)',
      'Weighted blanket ($60)',
      'Premium supplement stack: Magnesium Glycinate + L-Theanine + Apigenin ($50)'
    ]
  },
  {
    id: 'spa_experience',
    title: 'Sleep Spa Experience',
    description: 'The ultimate relaxation experience',
    value: 300,
    emoji: '🧖',
    items: [
      'Float tank session (2 hours)',
      '90-minute deep tissue massage',
      'Theragun Mini for home use ($200)',
      'Aromatherapy sleep kit'
    ]
  },
  {
    id: 'sleepers_choice',
    title: "Sleeper's Choice",
    description: 'You pick exactly what you want',
    value: 300,
    emoji: '🎁',
    items: [
      '$300 to spend on ANY sleep products you want',
      'Amazon, Best Buy, or direct from brands',
      'Build your own perfect sleep setup!'
    ]
  },
];
