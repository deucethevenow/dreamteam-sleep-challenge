import { Team, Badge, DailyQuest, BonusActivity } from './types';

export const APP_NAME = "dreamteam";
export const DAILY_GOAL = 8; // 8 hours of sleep
export const DAYS_IN_MONTH = 31;

// January Calculation: 10 Users * 8 hours * 31 Days = 2,480 hours
export const GLOBAL_GOAL = 10 * DAILY_GOAL * DAYS_IN_MONTH; 

// Team Goal: The average hours per member needed to have a "perfect month"
// 8h * 31 days = 248 hours per person
export const TEAM_AVG_GOAL = DAILY_GOAL * DAYS_IN_MONTH;

// Weekly Logic
export const WEEKLY_GOAL = DAILY_GOAL * 7; // 56 hours
export const RAFFLE_THRESHOLD_PCT = 0.6; // 60%
export const RAFFLE_THRESHOLD_HOURS = WEEKLY_GOAL * RAFFLE_THRESHOLD_PCT; // 33.6 hours

// Grand Prize Logic (Monthly)
export const MONTHLY_INDIVIDUAL_GOAL = DAILY_GOAL * DAYS_IN_MONTH;
export const GRAND_PRIZE_THRESHOLD_PCT = 0.7; // 70%
export const GRAND_PRIZE_THRESHOLD_HOURS = MONTHLY_INDIVIDUAL_GOAL * GRAND_PRIZE_THRESHOLD_PCT; // 173.6 hours

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
  { hours: 500, label: "Cozy Cabin in the Woods" },
  { hours: 1000, label: "Zen Meditation Retreat" },
  { hours: 1500, label: "Cloud Nine Sanctuary" },
  { hours: 2000, label: "Aurora Borealis Dreamland" },
  { hours: 2480, label: "Hibernation Hall of Fame" },
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

// --- WEEKLY AWARDS (Fun Recognition) ---
export interface WeeklyAward {
  id: string;
  emoji: string;
  title: string;
  description: string;
  criteria: string;
}

export const WEEKLY_AWARDS: WeeklyAward[] = [
  { 
    id: 'streak_master', 
    emoji: '🔥', 
    title: 'Streak Master', 
    description: 'Most days logged this week',
    criteria: 'Person who logged sleep the most days (consistency champion!)'
  },
  { 
    id: 'hibernation_hero', 
    emoji: '🛏️', 
    title: 'Hibernation Hero', 
    description: 'Longest single sleep session',
    criteria: 'Most hours logged in a single night'
  },
  { 
    id: 'quick_sleeper', 
    emoji: '⚡', 
    title: 'Quick Sleeper', 
    description: 'Fastest to fall asleep',
    criteria: 'Lowest sleep latency (from tracker data)'
  },
  { 
    id: 'most_improved', 
    emoji: '📈', 
    title: 'Most Improved', 
    description: 'Biggest week-over-week improvement',
    criteria: 'Largest increase in average sleep hours vs previous week'
  },
  { 
    id: 'consistency_royalty', 
    emoji: '🎯', 
    title: 'Consistency Crown', 
    description: 'Most consistent bedtime',
    criteria: 'Smallest variation in bedtime across the week'
  },
  { 
    id: 'deep_diver', 
    emoji: '💎', 
    title: 'Deep Diver', 
    description: 'Highest deep sleep percentage',
    criteria: 'Best ratio of deep sleep to total sleep'
  },
  { 
    id: 'dream_weaver', 
    emoji: '🌈', 
    title: 'Dream Weaver', 
    description: 'Highest REM percentage',
    criteria: 'Best ratio of REM sleep to total sleep'
  },
  { 
    id: 'early_bird', 
    emoji: '🌅', 
    title: 'Early Bird', 
    description: 'Earliest riser (with 7+ hours)',
    criteria: 'Earliest average wake time while still hitting goal'
  },
  { 
    id: 'night_owl_reformed', 
    emoji: '🦉', 
    title: 'Reformed Night Owl', 
    description: 'Most improved bedtime',
    criteria: 'Biggest shift to earlier bedtime vs previous week'
  },
  { 
    id: 'weekly_mvp', 
    emoji: '🏆', 
    title: 'Weekly MVP', 
    description: 'Best overall sleep score',
    criteria: 'Highest average sleep score across all logged nights'
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
