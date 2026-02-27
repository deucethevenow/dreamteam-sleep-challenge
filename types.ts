
export interface Team {
  id: number;
  name: string;
  color_hex: string;
  icon: string;
}

export interface User {
  id: number;
  username: string;
  team_id: number;
  avatar_emoji: string;
  raffle_tickets: number;
  grand_prize_entry: boolean;
  banked_hours: number; 
}

export interface SleepMetrics {
  // Sleep Score (0-100) - composite metric like Oura/Fitbit/Apple
  sleep_score?: number;
  
  // Sleep Stages (in minutes)
  deep_sleep_min?: number;    // N3/Slow Wave - physical recovery (ideal: 60-120 min, 15-25%)
  rem_sleep_min?: number;     // REM - mental recovery, dreams (ideal: 90-120 min, 20-25%)
  light_sleep_min?: number;   // N1/N2 - transition sleep (typically 50-60%)
  awake_min?: number;         // Time spent awake during the night
  
  // Additional metrics
  sleep_latency_min?: number; // Time to fall asleep (ideal: 10-20 min)
  wake_count?: number;        // Number of times woken during night
  sleep_efficiency?: number;  // % of time in bed actually sleeping (ideal: 85%+)
  
  // Heart metrics (if available from wearables)
  avg_heart_rate?: number;
  hrv?: number;               // Heart rate variability
  respiratory_rate?: number;
}

export interface SleepLog {
  id: number;
  user_id: number;
  date_logged: string; // YYYY-MM-DD (the night of sleep, e.g., sleep on Jan 5 = "2025-01-05")
  bedtime: string; // HH:MM (24hr format)
  wake_time: string; // HH:MM (24hr format)
  sleep_hours: number; // Calculated total hours
  quality_rating?: number; // 1-5 stars (manual rating)
  screenshot_url?: string; // Optional verification screenshot
  notes?: string;
  bonus_type?: 'Bonus: No Caffeine' | 'Bonus: Wind Down' | 'Bonus: No Screens' | 'Bonus: Cool Room' | 'Bonus: Meditation' | 'Bonus: Consistent Schedule' | 'Bonus: Nap';
  
  // Detailed sleep metrics (optional - from wearables/apps)
  metrics?: SleepMetrics;
}

// Legacy compatibility - map to SleepLog
export type ActivityLog = SleepLog;

export interface TeamStats {
  team: Team;
  totalHours: number;
  memberCount: number;
  averageHours: number;
  avgSleepScore: number;
  members: User[];
}

export interface UserStats {
  user: User;
  teamName: string;
  totalHours: number;
  avgSleepScore: number;
  streak: number;
  badges: Badge[];
  compositeScore: number;       // 0-100 composite score
  consistencyVariation: number; // avg minutes variation
  avgQuality?: number;          // avg quality rating 1-5
}

export interface GlobalProgress {
  totalHours: number;
  goal: number;
  percentage: number;
  currentLocation: string;
  pace: number;              // percentage: >100 = ahead, <100 = behind
  expectedHours: number;     // where we should be by today
  projectedFinish: string;   // "Day 28" or "Won't reach goal"
  dailyNeeded: number;       // hours/day needed to hit goal from here
}

export interface DailyTeamStat {
  date: string;
  teams: {
    teamId: number;
    totalHours: number;
  }[];
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  description: string;
  earned: boolean;
}

export interface DailyQuest {
  id: string;
  label: string;
  description: string;
  icon: string;
  targetValue?: number; // e.g. 8 hours
}

export interface BonusActivity {
  type: string;
  label: string;
  hours: number;
  description: string;
  icon: string;
}
