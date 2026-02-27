import { Team, User, SleepLog, TeamStats, UserStats, DailyTeamStat, Badge, GlobalProgress, SleepMetrics, BonusType } from '../types';
import { GLOBAL_GOAL, MILESTONES, DAILY_GOAL, BADGES, RAFFLE_THRESHOLD_HOURS, GRAND_PRIZE_THRESHOLD_HOURS, INITIAL_TEAMS, INITIAL_USERS, PARTICIPANT_COUNT, calculateSleepHours, calculateCompositeScore, calculateConsistencyVariation } from '../constants';

// API BASE URL - In Replit/Production this is usually relative or configured
const API_URL = '/api';

// Helper: Get date string in Mountain Time (YYYY-MM-DD format)
const getMountainTimeDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
}; 

class DataService {
  
  // Internal storage for "Offline/Mock" mode
  private mockLogs: SleepLog[] = [];
  private mockUsers: User[] = [...INITIAL_USERS];
  private isOnline: boolean = false;

  constructor() {
    this.checkConnection();
  }

  async checkConnection(): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/teams`);
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            this.isOnline = true;
            return true;
        }
    } catch (e) {}
    this.isOnline = false;
    return false;
  }

  public getIsOnline(): boolean {
      return this.isOnline;
  }

  // --- API Helpers with Fallback ---

  private async fetchTeams(): Promise<Team[]> {
    try {
        const res = await fetch(`${API_URL}/teams`);
        if (!res.ok) throw new Error("API Error");
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid JSON response");
        }
        this.isOnline = true;
        return await res.json();
    } catch (err) {
        console.warn("Backend unreachable, using static data for Teams.");
        this.isOnline = false;
        return INITIAL_TEAMS;
    }
  }

  private async fetchUsers(): Promise<User[]> {
    try {
        const res = await fetch(`${API_URL}/users`);
        if (!res.ok) throw new Error("API Error");
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid JSON response");
        }
        this.isOnline = true;
        return await res.json();
    } catch (err) {
        console.warn("Backend unreachable, using static data for Users.");
        this.isOnline = false;
        return this.mockUsers; 
    }
  }

  private async fetchLogs(): Promise<SleepLog[]> {
    try {
        const res = await fetch(`${API_URL}/logs`);
        if (!res.ok) throw new Error("API Error");
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Invalid JSON response");
        }
        const serverLogs = await res.json();
        this.isOnline = true;
        return serverLogs;
    } catch (err) {
        console.warn("Backend unreachable, returning session logs.");
        this.isOnline = false;
        return this.mockLogs;
    }
  }

  // --- Auth ---

  async loginById(userId: number): Promise<User> {
    const users = await this.fetchUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");
    return user;
  }

  // --- Actions ---

  async logSleep(
    userId: number, 
    bedtime: string, 
    wakeTime: string, 
    qualityRating?: number,
    screenshotUrl?: string,
    notes?: string,
    customDate?: string,
    metrics?: SleepMetrics
  ): Promise<void> {
    const dateStr = customDate || getMountainTimeDate();
    const sleepHours = calculateSleepHours(bedtime, wakeTime);

    try {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          date_logged: dateStr,
          bedtime,
          wake_time: wakeTime,
          sleep_hours: sleepHours,
          quality_rating: qualityRating,
          notes,
          screenshot_url: screenshotUrl,
          metrics
        })
      });
      if (!res.ok) throw new Error("Failed to save log to server");
      this.isOnline = true;
    } catch (err) {
      console.warn("Backend save failed. Saving locally for session.", err);
      this.isOnline = false;
      const newLog: SleepLog = {
        id: Math.random(),
        user_id: userId,
        date_logged: dateStr,
        bedtime,
        wake_time: wakeTime,
        sleep_hours: sleepHours,
        quality_rating: qualityRating,
        notes,
        screenshot_url: screenshotUrl,
        metrics
      };
      this.mockLogs.push(newLog);
      
      const uIndex = this.mockUsers.findIndex(u => u.id === userId);
      if (uIndex > -1) {
        this.mockUsers[uIndex].banked_hours += sleepHours;
      }
    }
  }

  // Log bonus activity (gives hour credits)
  async logBonus(userId: number, hours: number, bonusType: BonusType, customDate?: string): Promise<void> {
    const dateStr = customDate || getMountainTimeDate();

    try {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          date_logged: dateStr,
          bedtime: '00:00',
          wake_time: '00:00',
          sleep_hours: hours,
          bonus_type: bonusType,
          notes: `Bonus: ${bonusType}`
        })
      });
      if (!res.ok) throw new Error("Failed to save bonus to server");
      this.isOnline = true;
    } catch (err) {
      console.warn("Backend save failed. Saving locally for session.", err);
      this.isOnline = false;
      const newLog: SleepLog = {
        id: Math.random(),
        user_id: userId,
        date_logged: dateStr,
        bedtime: '00:00',
        wake_time: '00:00',
        sleep_hours: hours,
        bonus_type: bonusType,
        notes: `Bonus: ${bonusType}`
      };
      this.mockLogs.push(newLog);
      
      const uIndex = this.mockUsers.findIndex(u => u.id === userId);
      if (uIndex > -1) {
        this.mockUsers[uIndex].banked_hours += hours;
      }
    }
  }

  async enterWeeklyRaffle(userId: number): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/users/${userId}/raffle`, { method: 'POST' });
        if(!res.ok) throw new Error("API Fail");
        this.isOnline = true;
        return true;
    } catch (err) {
        console.warn("Backend fail. Updating local state.");
        this.isOnline = false;
        const u = this.mockUsers.find(u => u.id === userId);
        if (u) u.raffle_tickets = 1;
        return true;
    }
  }

  async enterGrandPrize(userId: number): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/users/${userId}/grandprize`, { method: 'POST' });
        if(!res.ok) throw new Error("API Fail");
        this.isOnline = true;
        return true;
    } catch (err) {
        console.warn("Backend fail. Updating local state.");
        this.isOnline = false;
        const u = this.mockUsers.find(u => u.id === userId);
        if (u) u.grand_prize_entry = true;
        return true;
    }
  }

  // --- Data Getters ---

  async getAllTeams(): Promise<Team[]> {
    return this.fetchTeams();
  }

  async getAllUsers(): Promise<User[]> {
    return this.fetchUsers();
  }

  async getRaffleParticipants(): Promise<User[]> {
    try {
      const CHALLENGE_START = new Date('2025-01-01T00:00:00-07:00');
      const today = new Date();
      const todayStr = getMountainTimeDate(today);
      const todayDate = new Date(todayStr + 'T12:00:00-07:00');
      const daysSinceStart = Math.floor(
        (todayDate.getTime() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24)
      );
      const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 4);

      const res = await fetch(`${API_URL}/prizes/${currentWeek}/entries`);
      if (!res.ok) throw new Error("API Error");
      const entries = await res.json();

      return entries
        .filter((e: any) => e.qualified && e.opted_in)
        .map((e: any) => ({
          id: e.user_id,
          username: e.username,
          avatar_emoji: e.avatar_emoji,
          team_id: e.team_id,
          banked_hours: 0,
          raffle_tickets: 1,
          grand_prize_entry: false
        } as User));
    } catch (err) {
      console.warn("Failed to fetch raffle participants:", err);
      const users = await this.fetchUsers();
      return users.filter(u => u.raffle_tickets > 0);
    }
  }

  async getGrandPrizeParticipants(): Promise<User[]> {
    const users = await this.fetchUsers();
    return users.filter(u => u.grand_prize_entry);
  }

  async getWeeklyHours(userId: number): Promise<number> {
    const logs = await this.fetchLogs();

    const CHALLENGE_START = new Date('2025-01-01T00:00:00-07:00');
    const today = new Date();
    const todayStr = getMountainTimeDate(today);
    const todayDate = new Date(todayStr + 'T12:00:00-07:00');

    const daysSinceStart = Math.floor(
      (todayDate.getTime() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 4);

    const weekStartDate = new Date(CHALLENGE_START);
    weekStartDate.setDate(weekStartDate.getDate() + (currentWeek - 1) * 7);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const weekStartStr = getMountainTimeDate(weekStartDate);
    const weekEndStr = getMountainTimeDate(weekEndDate);

    return logs
        .filter(l => {
            return l.user_id === userId &&
                   l.date_logged >= weekStartStr &&
                   l.date_logged <= weekEndStr;
        })
        .reduce((sum, l) => sum + l.sleep_hours, 0);
  }

  async getTotalMonthHours(userId: number): Promise<number> {
    const logs = await this.fetchLogs();
    return logs
        .filter(l => l.user_id === userId)
        .reduce((sum, l) => sum + l.sleep_hours, 0);
  }

  async getTodayHours(userId: number): Promise<number> {
    const logs = await this.fetchLogs();
    const today = getMountainTimeDate();
    return logs
      .filter(l => l.user_id === userId && l.date_logged === today)
      .reduce((sum, l) => sum + l.sleep_hours, 0);
  }

  async getLastNightSleep(userId: number): Promise<SleepLog | null> {
    const logs = await this.fetchLogs();
    const today = getMountainTimeDate();
    const todayLogs = logs.filter(l => l.user_id === userId && l.date_logged === today && !l.bonus_type);
    return todayLogs.length > 0 ? todayLogs[todayLogs.length - 1] : null;
  }

  async getUserLogs(userId: number): Promise<SleepLog[]> {
    const logs = await this.fetchLogs();
    return logs
      .filter(l => l.user_id === userId)
      .sort((a, b) => new Date(b.date_logged).getTime() - new Date(a.date_logged).getTime());
  }

  async updateLog(logId: number, sleepHours: number, bedtime: string, wakeTime: string, qualityRating: number | undefined, dateLogged: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sleep_hours: sleepHours,
          bedtime,
          wake_time: wakeTime,
          quality_rating: qualityRating,
          date_logged: dateLogged
        })
      });
      if (!res.ok) throw new Error("Failed to update log");
      this.isOnline = true;
      return true;
    } catch (err) {
      console.warn("Backend update failed.", err);
      this.isOnline = false;
      return false;
    }
  }

  async deleteLog(logId: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/logs/${logId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete log");
      this.isOnline = true;
      return true;
    } catch (err) {
      console.warn("Backend delete failed.", err);
      this.isOnline = false;
      return false;
    }
  }

  async getGlobalProgress(): Promise<GlobalProgress> {
    const logs = await this.fetchLogs();

    const CHALLENGE_START_DATE = new Date('2026-03-01');
    const CHALLENGE_END_DATE = new Date('2026-03-31');
    const challengeLogs = logs.filter(log =>
      log.date_logged >= '2026-03-01' && log.date_logged <= '2026-03-31'
    );

    const totalHours = challengeLogs.reduce((sum, log) => sum + log.sleep_hours, 0);
    const percentage = Math.min(100, Math.round((totalHours / GLOBAL_GOAL) * 100));

    let currentLocation = MILESTONES[0].label;
    for (let i = 0; i < MILESTONES.length; i++) {
      if (totalHours >= MILESTONES[i].hours) {
        currentLocation = MILESTONES[i].label;
      }
    }

    // Trajectory calculations
    const today = new Date();
    const dayOfChallenge = Math.max(1, Math.floor(
      (today.getTime() - CHALLENGE_START_DATE.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1);
    const totalDays = 31;
    const daysRemaining = Math.max(0, totalDays - dayOfChallenge);

    // Expected hours by today = (day / totalDays) * goal
    const expectedHours = Math.round((dayOfChallenge / totalDays) * GLOBAL_GOAL * 10) / 10;
    const pace = expectedHours > 0 ? Math.round((totalHours / expectedHours) * 100) : 100;

    // Daily needed = remaining hours / remaining days (per person)
    const remainingHours = GLOBAL_GOAL - totalHours;
    const dailyNeeded = daysRemaining > 0
      ? Math.round((remainingHours / daysRemaining / PARTICIPANT_COUNT) * 10) / 10  // per person per day
      : 0;

    // Projected finish day
    const avgDailyRate = dayOfChallenge > 0 ? totalHours / dayOfChallenge : 0;
    let projectedFinish = "Won't reach goal";
    if (avgDailyRate > 0) {
      const daysToGoal = Math.ceil((GLOBAL_GOAL - totalHours) / avgDailyRate);
      const finishDay = dayOfChallenge + daysToGoal;
      if (finishDay <= totalDays) {
        projectedFinish = `Day ${finishDay}`;
      }
    }
    if (totalHours >= GLOBAL_GOAL) projectedFinish = 'Complete!';

    return {
      totalHours,
      goal: GLOBAL_GOAL,
      percentage,
      currentLocation,
      pace,
      expectedHours,
      projectedFinish,
      dailyNeeded,
    };
  }

  async getTeamStats(): Promise<TeamStats[]> {
    const teams = await this.fetchTeams();
    const users = await this.fetchUsers();
    const logs = await this.fetchLogs();

    return teams.map(team => {
      const teamMembers = users.filter(u => u.team_id === team.id);
      const memberIds = teamMembers.map(u => u.id);
      const teamLogs = logs.filter(l => memberIds.includes(l.user_id));
      const totalHours = teamLogs.reduce((sum, log) => sum + log.sleep_hours, 0);
      const memberCount = teamMembers.length;
      const averageHours = memberCount > 0 ? Math.round((totalHours / memberCount) * 10) / 10 : 0;

      return {
        team,
        totalHours,
        memberCount,
        averageHours,
        avgSleepScore: 0,
        members: teamMembers
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }

  async getTeamDailyHistory(): Promise<DailyTeamStat[]> {
    const teams = await this.fetchTeams();
    const users = await this.fetchUsers();
    const logs = await this.fetchLogs();

    const history: DailyTeamStat[] = [];
    const today = new Date();
    const challengeStart = new Date('2025-01-01');

    const daysSinceStart = Math.floor((today.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysToShow = Math.min(daysSinceStart + 1, 7);

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      if (d < challengeStart) continue;

      const dateStr = getMountainTimeDate(d);

      const dayStats: DailyTeamStat = {
        date: dateStr.slice(5),
        teams: []
      };

      teams.forEach(team => {
        const teamMembers = users.filter(u => u.team_id === team.id);
        const memberIds = teamMembers.map(u => u.id);

        const teamDayLogs = logs.filter(l => l.date_logged === dateStr && memberIds.includes(l.user_id));
        const totalDayHours = teamDayLogs.reduce((sum, l) => sum + l.sleep_hours, 0);

        dayStats.teams.push({
          teamId: team.id,
          totalHours: totalDayHours
        });
      });

      history.push(dayStats);
    }

    return history;
  }

  // --- Client-side Stats Calculation ---

  private calculateStreak(userLogs: SleepLog[]): number {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = getMountainTimeDate(d);
      
      const dayHours = userLogs
        .filter(l => l.date_logged === dateStr)
        .reduce((sum, l) => sum + l.sleep_hours, 0);
        
      if (dayHours >= DAILY_GOAL) {
        streak++;
      } else if (i === 0 && dayHours < DAILY_GOAL) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  }

  private calculateBadges(userLogs: SleepLog[], streak: number, dailyWins: number): Badge[] {
    const earnedBadges = JSON.parse(JSON.stringify(BADGES));
    
    if (streak >= 3) earnedBadges.find((b: Badge) => b.id === 'streak_3')!.earned = true;
    
    // Early sleeper - in bed before 10pm (exclude 0-5am which are late nights, not early)
    if (userLogs.some(l => {
      if (!l.bedtime || l.bonus_type) return false;
      const [h, m] = l.bedtime.split(':').map(Number);
      return h >= 6 && (h < 22 || (h === 22 && m === 0));
    })) {
      earnedBadges.find((b: Badge) => b.id === 'early_sleeper')!.earned = true;
    }
    
    // Quality king - 5 star rating
    if (userLogs.some(l => l.quality_rating === 5)) {
      earnedBadges.find((b: Badge) => b.id === 'quality_king')!.earned = true;
    }
    
    // Deep sleeper - 9+ hours
    if (userLogs.some(l => l.sleep_hours >= 9 && !l.bonus_type)) {
      earnedBadges.find((b: Badge) => b.id === 'deep_sleeper')!.earned = true;
    }

    const weekendLog = userLogs.find(l => {
      const date = new Date(l.date_logged);
      const day = date.getUTCDay();
      return (day === 0 || day === 6) && l.sleep_hours >= DAILY_GOAL;
    });
    if (weekendLog) {
      earnedBadges.find((b: Badge) => b.id === 'weekend')!.earned = true;
    }

    if (dailyWins > 0) {
      const winnerBadge = earnedBadges.find((b: Badge) => b.id === 'daily_winner');
      if (winnerBadge) {
        winnerBadge.earned = true;
        winnerBadge.description = `Best sleeper for ${dailyWins} night${dailyWins > 1 ? 's' : ''}!`;
      }
    }

    return earnedBadges;
  }

  async getUserStats(): Promise<UserStats[]> {
    const users = await this.fetchUsers();
    const logs = await this.fetchLogs();
    const teams = await this.fetchTeams();

    const dailyTotals: Record<string, Record<number, number>> = {};
    logs.forEach(log => {
      if (!dailyTotals[log.date_logged]) dailyTotals[log.date_logged] = {};
      dailyTotals[log.date_logged][log.user_id] = (dailyTotals[log.date_logged][log.user_id] || 0) + log.sleep_hours;
    });

    const userDailyWins: Record<number, number> = {};
    const todayStr = getMountainTimeDate();

    Object.entries(dailyTotals).forEach(([date, userHours]) => {
      if (date === todayStr) return;
      let maxHours = 0;
      let winners: number[] = [];
      Object.entries(userHours).forEach(([userIdStr, hours]) => {
        const userId = parseInt(userIdStr);
        if (hours > maxHours) {
          maxHours = hours;
          winners = [userId];
        } else if (hours === maxHours) {
          winners.push(userId);
        }
      });
      winners.forEach(uid => {
        userDailyWins[uid] = (userDailyWins[uid] || 0) + 1;
      });
    });

    return users.map(user => {
      const userLogs = logs.filter(l => l.user_id === user.id);
      const totalHours = userLogs.reduce((sum, log) => sum + log.sleep_hours, 0);
      const team = teams.find(t => t.id === user.team_id);
      const streak = this.calculateStreak(userLogs);
      const dailyWins = userDailyWins[user.id] || 0;
      const badges = this.calculateBadges(userLogs, streak, dailyWins);

      // Calculate consistency from recent logs
      const recentLogs = userLogs
        .sort((a, b) => b.date_logged.localeCompare(a.date_logged))
        .slice(0, 7);
      const consistency = calculateConsistencyVariation(recentLogs);

      // Calculate average wearable metrics for composite score
      const logsWithMetrics = userLogs.filter(l => !l.bonus_type && l.sleep_hours > 0);
      const avgEfficiency = logsWithMetrics.length > 0 && logsWithMetrics.some(l => l.metrics?.sleep_efficiency)
        ? logsWithMetrics.filter(l => l.metrics?.sleep_efficiency).reduce((sum, l) => sum + (l.metrics?.sleep_efficiency || 0), 0) / logsWithMetrics.filter(l => l.metrics?.sleep_efficiency).length
        : undefined;

      const avgDeepPct = logsWithMetrics.length > 0 && logsWithMetrics.some(l => l.metrics?.deep_sleep_min)
        ? logsWithMetrics.filter(l => l.metrics?.deep_sleep_min).reduce((sum, l) => {
            const totalMin = l.sleep_hours * 60;
            return sum + ((l.metrics?.deep_sleep_min || 0) / totalMin) * 100;
          }, 0) / logsWithMetrics.filter(l => l.metrics?.deep_sleep_min).length
        : undefined;

      const avgRemPct = logsWithMetrics.length > 0 && logsWithMetrics.some(l => l.metrics?.rem_sleep_min)
        ? logsWithMetrics.filter(l => l.metrics?.rem_sleep_min).reduce((sum, l) => {
            const totalMin = l.sleep_hours * 60;
            return sum + ((l.metrics?.rem_sleep_min || 0) / totalMin) * 100;
          }, 0) / logsWithMetrics.filter(l => l.metrics?.rem_sleep_min).length
        : undefined;

      const avgLatency = logsWithMetrics.length > 0 && logsWithMetrics.some(l => l.metrics?.sleep_latency_min)
        ? logsWithMetrics.filter(l => l.metrics?.sleep_latency_min).reduce((sum, l) => sum + (l.metrics?.sleep_latency_min || 0), 0) / logsWithMetrics.filter(l => l.metrics?.sleep_latency_min).length
        : undefined;

      // Average nightly hours for composite (not total)
      const avgNightlyHours = logsWithMetrics.length > 0
        ? logsWithMetrics.reduce((sum, l) => sum + l.sleep_hours, 0) / logsWithMetrics.length
        : 0;

      const composite = calculateCompositeScore(
        avgNightlyHours,
        consistency.avgVariation,
        avgEfficiency,
        avgDeepPct,
        avgRemPct,
        avgLatency,
      );

      // Calculate average quality
      const qualityLogs = userLogs.filter(l => l.quality_rating);
      const avgQuality = qualityLogs.length > 0
        ? qualityLogs.reduce((sum, l) => sum + (l.quality_rating || 0), 0) / qualityLogs.length
        : undefined;

      return {
        user,
        teamName: team ? team.name : 'Unknown',
        totalHours,
        streak,
        badges,
        compositeScore: composite.total,
        consistencyVariation: consistency.avgVariation,
        avgQuality,
        avgSleepScore: composite.total,
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
  }
  
  getDaysLeftInMonth(): number {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const diff = endOfMonth.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  getCurrentDayOfMonth(): number {
    const now = new Date();
    return now.getDate();
  }

  async getDailyWinCount(userId: number): Promise<number> {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/daily-wins`);
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      return data.dailyWins || 0;
    } catch (err) {
      const logs = await this.fetchLogs();
      const dailyTotals: Record<string, Record<number, number>> = {};
      logs.forEach(log => {
        if (!dailyTotals[log.date_logged]) dailyTotals[log.date_logged] = {};
        dailyTotals[log.date_logged][log.user_id] = (dailyTotals[log.date_logged][log.user_id] || 0) + log.sleep_hours;
      });

      let wins = 0;
      const todayStr = getMountainTimeDate();
      Object.entries(dailyTotals).forEach(([date, userHours]) => {
        if (date === todayStr) return;
        const maxHours = Math.max(...Object.values(userHours));
        const userHoursToday = userHours[userId] || 0;
        if (userHoursToday === maxHours && maxHours > 0) {
          wins++;
        }
      });
      return wins;
    }
  }
}

export const db = new DataService();
