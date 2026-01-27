import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import path from 'path';
import { sendSlackLog, sendSlackDailyUpdate, sendSlackMorningRecap, getDailyWinCount, previewMorningRecap, drawWeeklyPrizeWinner, drawGrandPrizeWinner, announceGrandPrizeWinner, postToSlack, checkAndAnnounceMilestone, sendWeeklyPrizeQualificationCelebration, sendGrandPrizeQualificationCelebration, gatherChallengeStats, sendGrandPrizeCountdownPost, sendEpicFinaleAnnouncement } from './services/slackService';

// --- Constants & Seed Data ---
const INITIAL_TEAMS = [
  { id: 1, name: "The Night Owls", color_hex: "from-indigo-400 to-purple-500", icon: "🦉" },
  { id: 2, name: "The Dream Chasers", color_hex: "from-blue-400 to-cyan-400", icon: "✨" },
];

const INITIAL_USERS = [
  // Team 1 - The Night Owls (5 members)
  { id: 1, username: "Pam", slack_username: "pam", slack_user_id: "U05UC7E564F", team_id: 1, avatar_emoji: "😴", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 2, username: "Victoria", slack_username: "victoria newton", slack_user_id: "U06UWNKATU7", team_id: 1, avatar_emoji: "🌙", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 3, username: "Jack", slack_username: "jackshannon", slack_user_id: "U06FBCJUU", team_id: 1, avatar_emoji: "💤", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 4, username: "Francisco", slack_username: "francisco cazes", slack_user_id: "U09MF1GDBV4", team_id: 1, avatar_emoji: "🛏️", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 9, username: "Andy Cooper", slack_username: "andy", slack_user_id: "U09JL7ML316", team_id: 1, avatar_emoji: "⭐", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },

  // Team 2 - The Dream Chasers (5 members)
  { id: 5, username: "Claire", slack_username: "claire", slack_user_id: "U06P34GBSAC", team_id: 2, avatar_emoji: "✨", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 6, username: "Deuce", slack_username: "deuce", slack_user_id: "U06FDAS93", team_id: 2, avatar_emoji: "🧢", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 7, username: "Courtney", slack_username: "courtney cook", slack_user_id: "U09NCCX1KMZ", team_id: 2, avatar_emoji: "🌟", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 8, username: "Arb", slack_username: "arb", slack_user_id: "UCHB3H37B", team_id: 2, avatar_emoji: "🕶️", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
  { id: 10, username: "Anderson Camargo", slack_username: "anderson", slack_user_id: "U023CK0NK63", team_id: 2, avatar_emoji: "🎯", raffle_tickets: 0, grand_prize_entry: false, banked_hours: 0 },
];

// --- Database Setup ---
let pool: Pool | null = null;

// Debug: Check if DATABASE_URL is set
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  try {
    // For Cloud Run with Cloud SQL, use host socket configuration
    if (process.env.NODE_ENV === 'production') {
      pool = new Pool({
        user: 'postgres',
        password: 'TeamTrek2025!SecureDB#Pass',
        database: 'teamtrek',
        host: '/cloudsql/gen-lang-client-0271258032:us-central1:teamtrek-db'
      });
      console.log("Database pool created (Cloud SQL Unix socket)");
    } else {
      // For other environments, use connection string
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      console.log("Database pool created (connection string)");
    }
  } catch (err) {
    console.error("Failed to create database pool:", err);
  }
} else {
  console.warn("WARNING: DATABASE_URL is not set. Server will start in OFFLINE mode. API endpoints will fail.");
}

const app = express();
app.use(cors() as any);
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Slack slash commands (form-encoded data)

// Serve Static Files (Frontend)
// In production (Docker), serve from dist folder. In dev, serve from current directory.
const staticPath = process.env.NODE_ENV === 'production' ? path.resolve('./dist') : path.resolve('.');
app.use('/', express.static(staticPath) as any);

// --- Daily Slack Digest ---
// Now handled by Google Cloud Scheduler calling /api/test-daily-digest at 5:00 PM MT
// Cloud Scheduler is more reliable than node-cron on Cloud Run (which can spin down)

// --- Helper Functions ---

// REMOVED: Dummy data generation is disabled to protect production data
// This function has been permanently removed to prevent accidental data generation

const seedData = async () => {
  if (!pool) return;
  console.log("Seeding Teams...");
  for (const team of INITIAL_TEAMS) {
    await pool.query(
      'INSERT INTO teams (id, name, color_hex, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [team.id, team.name, team.color_hex, team.icon]
    );
  }

  console.log("Seeding Users...");
  for (const user of INITIAL_USERS) {
    await pool.query(
      'INSERT INTO users (id, username, slack_username, slack_user_id, team_id, avatar_emoji, raffle_tickets, grand_prize_entry, banked_hours) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET username = $2, slack_username = $3, slack_user_id = $4, team_id = $5',
      [user.id, user.username, user.slack_username, user.slack_user_id, user.team_id, user.avatar_emoji, user.raffle_tickets, user.grand_prize_entry, user.banked_hours]
    );
  }

  // Seed Prizes
  console.log("Seeding Prizes...");
  const prizes = [
    {
      week_number: 1,
      prize_type: 'weekly',
      title: 'Hatch Restore 2',
      description: 'The ultimate sunrise alarm clock + sound machine',
      emoji: '🌅'
    },
    {
      week_number: 2,
      prize_type: 'weekly',
      title: 'Total Blackout Bundle',
      description: 'Manta Sleep Mask PRO + SleepPhones Wireless + This Works Pillow Spray',
      emoji: '🌑'
    },
    {
      week_number: 3,
      prize_type: 'weekly',
      title: 'Recovery & Relaxation Kit',
      description: 'Theragun Mini + aromatherapy diffuser + essential oils',
      emoji: '💆'
    },
    {
      week_number: 4,
      prize_type: 'weekly',
      title: 'Cozy Sleep Upgrade',
      description: 'Weighted blanket + silk pillowcase + magnesium supplements + sleep tea',
      emoji: '☁️'
    },
    {
      week_number: null,
      prize_type: 'grand',
      title: 'Ultimate Sleep Setup OR Sleeper\'s Choice',
      description: 'Complete sleep tech bundle (Hatch + Manta + SleepPhones + weighted blanket + supplements) OR $300 to spend on any sleep products you want!',
      emoji: '👑'
    }
  ];

  for (const prize of prizes) {
    await pool.query(
      'INSERT INTO prizes (week_number, prize_type, title, description, emoji) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
      [prize.week_number, prize.prize_type, prize.title, prize.description, prize.emoji]
    );
  }

  // REMOVED: No longer generating dummy logs to protect production data
  console.log("Database Seeding Complete (users, teams, and prizes only - sleep logs are never auto-generated).");
};

// Initialize Tables
const initDB = async () => {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color_hex TEXT,
        icon TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        slack_username TEXT,
        slack_user_id TEXT,
        team_id INTEGER REFERENCES teams(id),
        avatar_emoji TEXT,
        raffle_tickets INTEGER DEFAULT 0,
        grand_prize_entry BOOLEAN DEFAULT FALSE,
        banked_hours NUMERIC DEFAULT 0
      );
    `);

    // Add columns if they don't exist (migration)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_username TEXT;
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS banked_hours NUMERIC DEFAULT 0;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sleep_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        date_logged TEXT NOT NULL,
        bedtime TEXT,
        wake_time TEXT,
        sleep_hours NUMERIC NOT NULL,
        quality_rating INTEGER,
        notes TEXT,
        screenshot_url TEXT,
        sleep_score INTEGER,
        deep_sleep_min INTEGER,
        rem_sleep_min INTEGER,
        light_sleep_min INTEGER,
        awake_min INTEGER,
        sleep_latency_min INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prizes (
        id SERIAL PRIMARY KEY,
        week_number INTEGER,
        prize_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        emoji TEXT,
        winner_user_id INTEGER REFERENCES users(id),
        drawn_at TIMESTAMP,
        UNIQUE(week_number, prize_type)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prize_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        prize_id INTEGER REFERENCES prizes(id),
        week_number INTEGER,
        opted_in BOOLEAN DEFAULT TRUE,
        qualified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, prize_id)
      );
    `);

    // Add winner columns to prizes if they don't exist
    try {
      await pool.query(`ALTER TABLE prizes ADD COLUMN IF NOT EXISTS winner_user_id INTEGER REFERENCES users(id)`);
      await pool.query(`ALTER TABLE prizes ADD COLUMN IF NOT EXISTS drawn_at TIMESTAMP`);
    } catch (e) {
      console.log("Prize columns may already exist");
    }

    // Create daily_winners table to track top sleeper each day
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_winners (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        user_id INTEGER REFERENCES users(id),
        sleep_hours NUMERIC NOT NULL,
        announced BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create milestone_events table to track milestone achievements (50%, 100%, etc.)
    // UNIQUE constraint on milestone_type prevents duplicate announcements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestone_events (
        id SERIAL PRIMARY KEY,
        milestone_type TEXT NOT NULL UNIQUE,
        threshold_value NUMERIC NOT NULL,
        total_hours_at_trigger NUMERIC NOT NULL,
        triggered_by_user_id INTEGER REFERENCES users(id),
        triggered_by_log_id INTEGER,
        announced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        slack_message_ts TEXT
      );
    `);

    // Add unique constraint to prevent duplicate prizes
    try {
      await pool.query(`ALTER TABLE prizes ADD CONSTRAINT prizes_week_type_unique UNIQUE (week_number, prize_type)`);
      console.log("Added unique constraint to prizes table");
    } catch (e) {
      console.log("Unique constraint may already exist on prizes table");
    }

    // Auto-seed
    await seedData();
    
  } catch (err) {
    console.error("Database Init Error:", err);
  }
};

initDB();

// --- Prize Auto Opt-In Helper ---
// Constants for prize thresholds (matching frontend constants.ts)
const RAFFLE_THRESHOLD_HOURS_SERVER = 42; // Weekly goal: 7 hours * 7 days = 49 hours, 60% = ~29.4, but let's use 42 (6 hours/night avg)
const GRAND_PRIZE_THRESHOLD_HOURS_SERVER = 168; // Monthly goal: ~196 hours (7 hrs * 28 days), 70% = ~137, but we'll use 168 (6 hrs/night * 28 days)
const CHALLENGE_START_SERVER = new Date('2025-12-01');

// Helper: Get date string in Mountain Time (YYYY-MM-DD format)
const getMountainTimeDateServer = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
};

// Helper: Get current challenge week (1-4)
const getCurrentWeekServer = (): number => {
  const today = new Date();
  const todayMT = new Date(getMountainTimeDateServer(today));
  const daysSinceStart = Math.floor((todayMT.getTime() - CHALLENGE_START_SERVER.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysSinceStart / 7) + 1;
  return Math.min(Math.max(week, 1), 4); // Clamp to 1-4
};

// Helper: Get the start date of a specific challenge week
const getWeekStartDateServer = (weekNumber: number): string => {
  const start = new Date(CHALLENGE_START_SERVER);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  return getMountainTimeDateServer(start);
};

// Helper: Get the end date of a specific challenge week
const getWeekEndDateServer = (weekNumber: number): string => {
  const start = new Date(CHALLENGE_START_SERVER);
  start.setDate(start.getDate() + (weekNumber - 1) * 7 + 6);
  return getMountainTimeDateServer(start);
};

// Auto opt-in user for weekly prize and grand prize when they hit thresholds
const autoOptInUserForPrizes = async (pool: Pool, userId: number): Promise<void> => {
  try {
    const currentWeek = getCurrentWeekServer();
    const weekStart = getWeekStartDateServer(currentWeek);
    const weekEnd = getWeekEndDateServer(currentWeek);

    // Calculate user's weekly sleep hours for current week
    const weeklyRes = await pool.query(`
      SELECT COALESCE(SUM(sleep_hours), 0) as weekly_total
      FROM sleep_logs
      WHERE user_id = $1 AND date_logged >= $2 AND date_logged <= $3
    `, [userId, weekStart, weekEnd]);
    const weeklyHours = parseFloat(weeklyRes.rows[0].weekly_total);

    // Check if user qualifies for weekly prize
    if (weeklyHours >= RAFFLE_THRESHOLD_HOURS_SERVER) {
      // Get the prize for this week
      const prizeRes = await pool.query('SELECT id FROM prizes WHERE week_number = $1', [currentWeek]);
      if (prizeRes.rows.length > 0) {
        const prizeId = prizeRes.rows[0].id;

        // Check if user is already opted in (to avoid duplicate celebrations)
        const existingEntry = await pool.query(
          'SELECT qualified FROM prize_entries WHERE user_id = $1 AND prize_id = $2',
          [userId, prizeId]
        );
        const wasAlreadyQualified = existingEntry.rows.length > 0 && existingEntry.rows[0].qualified;

        // Auto opt-in user (insert or update)
        await pool.query(`
          INSERT INTO prize_entries (user_id, prize_id, week_number, opted_in, qualified)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (user_id, prize_id) DO UPDATE SET opted_in = TRUE, qualified = TRUE
        `, [userId, prizeId, currentWeek]);

        // Send celebration message only if newly qualified! 🎉
        if (!wasAlreadyQualified) {
          console.log(`🎉 NEW qualifier! User ${userId} for week ${currentWeek} prize (${weeklyHours} hours)`);
          sendWeeklyPrizeQualificationCelebration(pool, userId, currentWeek, weeklyHours).catch(err => {
            console.error("Error sending weekly prize celebration:", err);
          });
        } else {
          console.log(`User ${userId} already qualified for week ${currentWeek} prize`);
        }
      }
    }

    // Calculate user's total December sleep hours for grand prize
    const totalRes = await pool.query(`
      SELECT COALESCE(SUM(sleep_hours), 0) as total
      FROM sleep_logs
      WHERE user_id = $1 AND date_logged >= '2025-12-01' AND date_logged <= '2025-12-31'
    `, [userId]);
    const totalDecemberHours = parseFloat(totalRes.rows[0].total);

    // Check if user qualifies for grand prize
    if (totalDecemberHours >= GRAND_PRIZE_THRESHOLD_HOURS_SERVER) {
      // Check if user was already qualified (to avoid duplicate celebrations)
      const userRes = await pool.query(
        'SELECT grand_prize_entry FROM users WHERE id = $1',
        [userId]
      );
      const wasAlreadyQualified = userRes.rows[0]?.grand_prize_entry === true;

      // Update user's grand_prize_entry flag
      await pool.query(
        'UPDATE users SET grand_prize_entry = TRUE WHERE id = $1 AND grand_prize_entry = FALSE',
        [userId]
      );

      // Send celebration message only if newly qualified! 🏆
      if (!wasAlreadyQualified) {
        console.log(`🏆 NEW GRAND PRIZE qualifier! User ${userId} (${totalDecemberHours} total hours)`);
        sendGrandPrizeQualificationCelebration(pool, userId, totalDecemberHours).catch(err => {
          console.error("Error sending grand prize celebration:", err);
        });
      }
    }
  } catch (err) {
    console.error(`Error in autoOptInUserForPrizes for user ${userId}:`, err);
  }
};

// --- API Endpoints ---

// DANGEROUS ENDPOINTS - COMPLETELY DISABLED IN PRODUCTION
// These endpoints have been permanently disabled to protect production data
// They will return 403 Forbidden in all environments

app.post('/api/reset', async (req, res) => {
  // PERMANENTLY DISABLED - This endpoint is too dangerous and has been removed
  console.error("BLOCKED: Attempted to call /api/reset - This endpoint is permanently disabled");
  return res.status(403).json({
    error: "This endpoint has been permanently disabled to protect production data",
    message: "Reset operations are not allowed. Contact system administrator if you need to modify data."
  });
});

app.post('/api/clear_logs', async (req, res) => {
  // PERMANENTLY DISABLED - This endpoint is too dangerous and has been removed
  console.error("BLOCKED: Attempted to call /api/clear_logs - This endpoint is permanently disabled");
  return res.status(403).json({
    error: "This endpoint has been permanently disabled to protect production data",
    message: "Clear operations are not allowed. Contact system administrator if you need to modify data."
  });
});

// DEBUG: Trigger Daily Slack Digest (for testing)
app.post('/api/test-daily-digest', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    console.log("Manually triggering daily digest...");
    await sendSlackDailyUpdate(pool);
    res.json({ success: true, message: "Daily digest sent to Slack!" });
  } catch (err: any) {
    console.error("Daily Digest Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Test prize qualification celebration
app.post('/api/test-celebration', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const { userId, type } = req.body; // type: 'weekly' or 'grand'
  try {
    if (type === 'grand') {
      // Get user's total December sleep hours
      const totalRes = await pool.query(`
        SELECT COALESCE(SUM(sleep_hours), 0) as total
        FROM sleep_logs
        WHERE user_id = $1 AND date_logged >= '2025-12-01' AND date_logged <= '2025-12-31'
      `, [userId]);
      const totalHours = parseFloat(totalRes.rows[0].total);
      await sendGrandPrizeQualificationCelebration(pool, userId, totalHours);
      res.json({ success: true, message: `Grand prize celebration sent for user ${userId}!` });
    } else {
      const currentWeek = getCurrentWeekServer();
      const weekStart = getWeekStartDateServer(currentWeek);
      const weekEnd = getWeekEndDateServer(currentWeek);
      const weeklyRes = await pool.query(`
        SELECT COALESCE(SUM(sleep_hours), 0) as weekly_total
        FROM sleep_logs
        WHERE user_id = $1 AND date_logged >= $2 AND date_logged <= $3
      `, [userId, weekStart, weekEnd]);
      const weeklyHours = parseFloat(weeklyRes.rows[0].weekly_total);
      await sendWeeklyPrizeQualificationCelebration(pool, userId, currentWeek, weeklyHours);
      res.json({ success: true, message: `Weekly celebration sent for user ${userId}!` });
    }
  } catch (err: any) {
    console.error("Test Celebration Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Morning Recap: Yesterday's results & top sleeper badge (9 AM MT via Cloud Scheduler)
app.post('/api/morning-recap', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    console.log("Triggering morning recap...");
    await sendSlackMorningRecap(pool);
    res.json({ success: true, message: "Morning recap sent to Slack!" });
  } catch (err: any) {
    console.error("Morning Recap Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Check timezone calculations
app.get('/api/debug/timezone', async (req, res) => {
  const now = new Date();
  const todayMT = now.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

  // Parse and calculate yesterday
  const todayParts = todayMT.split('-').map(Number);
  const todayInMT = new Date(todayParts[0], todayParts[1] - 1, todayParts[2], 12, 0, 0);
  const yesterdayInMT = new Date(todayInMT);
  yesterdayInMT.setDate(todayInMT.getDate() - 1);
  const yesterdayMT = yesterdayInMT.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

  // Check logs for yesterday
  let logsCount = 0;
  if (pool) {
    const logsRes = await pool.query('SELECT COUNT(*) as count FROM sleep_logs WHERE date_logged = $1', [yesterdayMT]);
    logsCount = parseInt(logsRes.rows[0]?.count || '0');
  }

  res.json({
    serverTimeUTC: now.toISOString(),
    todayInMT: todayMT,
    yesterdayInMT: yesterdayMT,
    logsFoundForYesterday: logsCount
  });
});

// Preview morning recap for a specific date (doesn't post to Slack)
app.get('/api/preview/morning-recap/:date', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    const { date } = req.params; // Expected format: YYYY-MM-DD
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }
    const preview = await previewMorningRecap(pool, date);
    res.json(preview);
  } catch (err: any) {
    console.error("Preview Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get daily wins count for a user (for badge display)
app.get('/api/users/:userId/daily-wins', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    const userId = parseInt(req.params.userId);
    const winCount = await getDailyWinCount(pool, userId);
    res.json({ userId, dailyWins: winCount });
  } catch (err: any) {
    console.error("Daily Wins Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Slack Slash Command: /logsleep
app.post('/api/slack/logsleep', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });

  try {
    const { user_id: slackUserId, user_name, text } = req.body;

    console.log(`Slack command received from ${user_name} (${slackUserId}): ${text}`);

    // Parse the text input (e.g., "7.5" or "7.5 great sleep")
    const parts = text.trim().split(/\s+/);
    const hours = parseFloat(parts[0]);
    const notes = parts.slice(1).join(' ') || '';

    if (isNaN(hours) || hours <= 0) {
      return res.json({
        response_type: "ephemeral",
        text: "❌ Invalid hours! Usage: `/logsleep 7.5` or `/logsleep 7.5 great sleep last night`"
      });
    }

    if (hours > 24) {
      return res.json({
        response_type: "ephemeral",
        text: "🤔 That seems like a lot of sleep! Please enter a reasonable number (max 24 hours)."
      });
    }

    // Find user by slack_user_id
    const userResult = await pool.query(
      'SELECT * FROM users WHERE slack_user_id = $1',
      [slackUserId]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        response_type: "ephemeral",
        text: `❌ Sorry, I couldn't find your account! Please make sure you're registered in the Sleep Challenge app first.\n\nYour Slack ID: ${slackUserId}`
      });
    }

    const user = userResult.rows[0];
    // Use Mountain Time for date logging (matches when users are active)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

    // Insert sleep log
    await pool.query(
      'INSERT INTO sleep_logs (user_id, sleep_hours, notes, date_logged) VALUES ($1, $2, $3, $4)',
      [user.id, hours, notes, today]
    );

    // Update banked hours
    await pool.query(
      'UPDATE users SET banked_hours = banked_hours + $1 WHERE id = $2',
      [hours, user.id]
    );

    // Get updated total
    const updatedUser = await pool.query(
      'SELECT banked_hours FROM users WHERE id = $1',
      [user.id]
    );
    const newTotal = parseFloat(updatedUser.rows[0].banked_hours);

    // Send Slack notification to channel
    const teamRes = await pool.query(
      'SELECT t.name as team_name, t.icon as team_icon FROM teams t JOIN users u ON u.team_id = t.id WHERE u.id = $1',
      [user.id]
    );
    const teamName = teamRes.rows[0]?.team_name || 'Unknown Team';
    const teamIcon = teamRes.rows[0]?.team_icon || '👥';

    // Calculate daily total for today
    const dailyRes = await pool.query(
      'SELECT COALESCE(SUM(sleep_hours), 0) as daily_total FROM sleep_logs WHERE user_id = $1 AND date_logged = $2',
      [user.id, today]
    );
    const dailyTotal = parseFloat(dailyRes.rows[0]?.daily_total || '0');

    sendSlackLog(user.username, teamName, teamIcon, hours, notes || 'Sleep logged', dailyTotal, newTotal).catch(console.error);

    // Auto opt-in for weekly prize and grand prize (async, don't block response)
    autoOptInUserForPrizes(pool, user.id).catch(err => {
      console.error("Slack auto opt-in error:", err);
    });

    // Respond to user (only they see this)
    return res.json({
      response_type: "ephemeral",
      text: `✅ Logged ${hours} hours of sleep!\n📊 Your total: ${newTotal.toFixed(1)} hours`
    });

  } catch (err: any) {
    console.error("Slack Log Sleep Error:", err);
    return res.json({
      response_type: "ephemeral",
      text: `❌ Error logging sleep: ${err.message}`
    });
  }
});

// Keep old endpoint for backwards compatibility (redirects to new one)
app.post('/api/slack/logsteps', async (req, res) => {
  return res.json({
    response_type: "ephemeral",
    text: "❌ This command has been updated! Please use `/logsleep` instead.\n\nUsage: `/logsleep 7.5` or `/logsleep 7.5 great sleep last night`"
  });
});

app.get('/api/teams', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error("Get Teams Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error("Get Users Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's sleep logs
app.get('/api/users/:id/logs', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const userId = parseInt(req.params.id);
  try {
    const result = await pool.query(
      'SELECT * FROM sleep_logs WHERE user_id = $1 ORDER BY date_logged DESC, created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("Get User Logs Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const userId = parseInt(req.params.id);
  const { team_id } = req.body;

  if (!team_id) {
    return res.status(400).json({ error: "team_id is required" });
  }

  try {
    await pool.query(
      'UPDATE users SET team_id = $1 WHERE id = $2',
      [team_id, userId]
    );
    res.json({ success: true, message: `User ${userId} moved to team ${team_id}` });
  } catch (err: any) {
    console.error("Update User Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MILESTONE STATUS ENDPOINTS
// ==========================================

// Get 50% milestone status for frontend celebration
app.get('/api/milestones/50-percent', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });

  try {
    // Check if 50% milestone has been achieved
    const milestoneRes = await pool.query(
      `SELECT * FROM milestone_events WHERE milestone_type = '50_percent'`
    );

    if (milestoneRes.rows.length > 0) {
      const milestone = milestoneRes.rows[0];

      // Get grand prize details
      const prizeRes = await pool.query(
        `SELECT * FROM prizes WHERE prize_type = 'grand'`
      );

      // Get triggering user info
      const userRes = await pool.query(
        `SELECT username, avatar_emoji FROM users WHERE id = $1`,
        [milestone.triggered_by_user_id]
      );

      res.json({
        achieved: true,
        achievedAt: milestone.announced_at,
        totalHoursAtTrigger: milestone.total_hours_at_trigger,
        triggeredBy: userRes.rows[0] || null,
        grandPrize: prizeRes.rows[0] || null
      });
    } else {
      // Not yet achieved - return current progress
      const progressRes = await pool.query(`
        SELECT COALESCE(SUM(sleep_hours), 0) as total
        FROM sleep_logs
        WHERE date_logged >= '2025-12-01' AND date_logged <= '2025-12-31'
      `);
      const totalHours = parseFloat(progressRes.rows[0].total);
      const threshold = 980; // 50% of ~1960 hours (10 people * 7 hrs * 28 days)
      const percentage = Math.min(100, (totalHours / threshold) * 100);

      res.json({
        achieved: false,
        currentHours: totalHours,
        threshold: threshold,
        percentage: percentage
      });
    }
  } catch (err: any) {
    console.error("Get Milestone Status Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/prizes', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    const result = await pool.query(`
      SELECT p.*, u.username as winner_name, u.avatar_emoji as winner_emoji
      FROM prizes p
      LEFT JOIN users u ON p.winner_user_id = u.id
      ORDER BY p.week_number NULLS LAST
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Get Prizes Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get prize entries for a specific week
app.get('/api/prizes/:week/entries', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const weekNumber = parseInt(req.params.week);
  try {
    const result = await pool.query(`
      SELECT pe.*, u.username, u.avatar_emoji, u.team_id
      FROM prize_entries pe
      JOIN users u ON pe.user_id = u.id
      WHERE pe.week_number = $1
      ORDER BY pe.created_at ASC
    `, [weekNumber]);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Get Prize Entries Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Opt in/out of a prize
app.post('/api/prizes/:week/opt', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const weekNumber = parseInt(req.params.week);
  const { user_id, opted_in } = req.body;

  try {
    const prize = await pool.query('SELECT id FROM prizes WHERE week_number = $1', [weekNumber]);
    if (prize.rows.length === 0) {
      return res.status(404).json({ error: "Prize not found" });
    }

    await pool.query(`
      INSERT INTO prize_entries (user_id, prize_id, week_number, opted_in)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, prize_id)
      DO UPDATE SET opted_in = $4
    `, [user_id, prize.rows[0].id, weekNumber, opted_in]);

    res.json({ success: true });
  } catch (err: any) {
    console.error("Prize Opt Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Preview prize draw (read-only, for testing) - shows who would be eligible
app.get('/api/prizes/:week/preview-draw', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const weekNumber = parseInt(req.params.week);

  if (weekNumber < 1 || weekNumber > 4) {
    return res.status(400).json({ error: "Week must be 1-4" });
  }

  try {
    // Get prize for this week
    const prizeRes = await pool.query(
      'SELECT * FROM prizes WHERE week_number = $1 AND prize_type = $2',
      [weekNumber, 'weekly']
    );

    if (prizeRes.rows.length === 0) {
      return res.json({ error: "Prize not found", weekNumber });
    }

    const prize = prizeRes.rows[0];

    // Get all qualified, opted-in entrants
    const entriesRes = await pool.query(`
      SELECT pe.*, u.username, u.slack_user_id, t.name as team_name
      FROM prize_entries pe
      JOIN users u ON pe.user_id = u.id
      JOIN teams t ON u.team_id = t.id
      WHERE pe.prize_id = $1 AND pe.qualified = TRUE AND pe.opted_in = TRUE
    `, [prize.id]);

    res.json({
      weekNumber,
      prize: {
        id: prize.id,
        title: prize.title,
        emoji: prize.emoji,
        alreadyDrawn: prize.winner_user_id !== null,
        winnerId: prize.winner_user_id,
        winnerName: prize.winner_name
      },
      qualifiedEntrants: entriesRes.rows.map(e => ({
        userId: e.user_id,
        username: e.username,
        team: e.team_name
      })),
      entrantCount: entriesRes.rows.length
    });
  } catch (err: any) {
    console.error("Preview Draw Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Manual prize draw (admin use) - actually draws a winner
app.post('/api/prizes/:week/draw', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const weekNumber = parseInt(req.params.week);

  if (weekNumber < 1 || weekNumber > 4) {
    return res.status(400).json({ error: "Week must be 1-4" });
  }

  try {
    const { winner, prize, qualifiedCount, alreadyDrawn } = await drawWeeklyPrizeWinner(pool, weekNumber);

    if (alreadyDrawn) {
      return res.json({
        success: false,
        message: `Week ${weekNumber} prize was already drawn`,
        winner_user_id: prize?.winner_user_id,
        winner_name: prize?.winner_name
      });
    }

    if (!winner) {
      return res.json({
        success: false,
        message: `No qualified entrants for Week ${weekNumber}`
      });
    }

    // Optionally announce to Slack (query param: ?announce=true)
    if (req.query.announce === 'true') {
      const winnerMention = winner.slack_user_id
        ? `<@${winner.slack_user_id}>`
        : `*${winner.username}*`;

      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🎉 WEEK ${weekNumber} PRIZE WINNER! 🎉`,
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Congratulations ${winnerMention}!* ${winner.avatar_emoji}\n\nYou've won the *${prize.emoji} ${prize.title}*!\n${winner.team_icon} ${winner.team_name}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `_${prize.description}_`
          }
        },
        {
          type: "context",
          elements: [{
            type: "mrkdwn",
            text: `🎲 Randomly selected from *${qualifiedCount}* qualified participants who hit ${RAFFLE_THRESHOLD_HOURS_SERVER} hours during Week ${weekNumber}. Great job everyone! 👏`
          }]
        }
      ];
      await postToSlack(blocks);
    }

    res.json({
      success: true,
      winner: {
        id: winner.user_id,
        username: winner.username,
        team: winner.team_name
      },
      prize: prize.title,
      qualifiedCount,
      announced: req.query.announce === 'true'
    });
  } catch (err: any) {
    console.error("Prize Draw Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ GRAND PRIZE ENDPOINTS ============

// Preview grand prize qualified participants (no actual drawing)
app.get('/api/prizes/grand/preview', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });

  try {
    // Get grand prize details
    const prizeRes = await pool.query(
      `SELECT * FROM prizes WHERE prize_type = 'grand'`
    );

    if (prizeRes.rows.length === 0) {
      return res.status(404).json({ error: "Grand prize not found in database" });
    }

    const prize = prizeRes.rows[0];

    // Check if already drawn
    if (prize.winner_user_id) {
      const winnerRes = await pool.query(
        'SELECT username, avatar_emoji FROM users WHERE id = $1',
        [prize.winner_user_id]
      );
      return res.json({
        alreadyDrawn: true,
        winner: winnerRes.rows[0],
        drawnAt: prize.drawn_at,
        prize: {
          title: prize.title,
          emoji: prize.emoji
        }
      });
    }

    // Get all qualified users
    const usersRes = await pool.query(`
      SELECT u.id, u.username, u.avatar_emoji, u.slack_user_id,
             t.name as team_name, t.icon as team_icon,
             COALESCE(SUM(sl.sleep_hours), 0) as total_hours
      FROM users u
      JOIN teams t ON u.team_id = t.id
      LEFT JOIN sleep_logs sl ON u.id = sl.user_id
      WHERE u.grand_prize_entry = TRUE
      GROUP BY u.id, u.username, u.avatar_emoji, u.slack_user_id, t.name, t.icon
      ORDER BY total_hours DESC
    `);

    res.json({
      alreadyDrawn: false,
      qualifiedCount: usersRes.rows.length,
      qualifiedUsers: usersRes.rows,
      prize: {
        title: prize.title,
        description: prize.description,
        emoji: prize.emoji
      },
      threshold: GRAND_PRIZE_THRESHOLD_HOURS_SERVER
    });
  } catch (err: any) {
    console.error("Grand Prize Preview Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Draw the grand prize winner (use ?announce=true to also post to Slack)
app.post('/api/prizes/grand/draw', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });

  try {
    // Check if we should announce to Slack
    const shouldAnnounce = req.query.announce === 'true';

    if (shouldAnnounce) {
      // Use the combined draw + announce function
      const result = await announceGrandPrizeWinner(pool);
      return res.json(result);
    }

    // Just draw without announcing
    const { winner, prize, qualifiedCount, alreadyDrawn, totalHours } = await drawGrandPrizeWinner(pool);

    if (alreadyDrawn) {
      // Get existing winner details
      const winnerRes = await pool.query(
        'SELECT username, avatar_emoji FROM users WHERE id = $1',
        [prize?.winner_user_id]
      );
      return res.json({
        success: false,
        message: "Grand prize has already been drawn",
        existingWinner: winnerRes.rows[0],
        drawnAt: prize?.drawn_at
      });
    }

    if (!winner) {
      return res.json({
        success: false,
        message: "No qualified participants for grand prize",
        qualifiedCount: 0
      });
    }

    res.json({
      success: true,
      message: "Grand prize winner drawn successfully!",
      winner: {
        id: winner.id,
        username: winner.username,
        avatar_emoji: winner.avatar_emoji,
        team: winner.team_name,
        totalHours
      },
      prize: {
        title: prize.title,
        emoji: prize.emoji
      },
      qualifiedCount,
      announced: false,
      tip: "Add ?announce=true to also post the winner to Slack"
    });
  } catch (err: any) {
    console.error("Grand Prize Draw Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Announce an already-drawn grand prize winner to Slack
app.post('/api/prizes/grand/announce', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });

  try {
    // Get the grand prize with winner info
    const prizeRes = await pool.query(`
      SELECT p.*, u.id as winner_id, u.username as winner_name, u.avatar_emoji as winner_emoji,
             u.slack_user_id, t.name as team_name, t.icon as team_icon,
             COALESCE(SUM(sl.sleep_hours), 0) as total_hours
      FROM prizes p
      LEFT JOIN users u ON p.winner_user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN sleep_logs sl ON u.id = sl.user_id
      WHERE p.prize_type = 'grand'
      GROUP BY p.id, u.id, u.username, u.avatar_emoji, u.slack_user_id, t.name, t.icon
    `);

    if (prizeRes.rows.length === 0) {
      return res.status(404).json({ error: "Grand prize not found" });
    }

    const prize = prizeRes.rows[0];

    if (!prize.winner_user_id) {
      return res.status(400).json({ error: "Grand prize has not been drawn yet. Use /api/prizes/grand/draw first." });
    }

    // Get count of qualified users
    const countRes = await pool.query('SELECT COUNT(*) as count FROM users WHERE grand_prize_entry = TRUE');
    const qualifiedCount = parseInt(countRes.rows[0].count);

    // Build and post the announcement
    const winnerMention = prize.slack_user_id
      ? `<@${prize.slack_user_id}>`
      : `*${prize.winner_name}*`;

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🏆✨ THE GRAND PRIZE WINNER IS... ✨🏆",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🥁 *DRUMROLL PLEASE...* 🥁`
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎊 *CONGRATULATIONS ${winnerMention}!* ${prize.winner_emoji} 🎊`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `You've won the *${prize.emoji} ${prize.title}*!\n${prize.team_icon} ${prize.team_name}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `_${prize.description}_`
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📊 *${prize.winner_name}'s December Stats:*\n• 😴 *${parseFloat(prize.total_hours).toFixed(1)} total hours of sleep*`
        }
      },
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: `🎲 Randomly selected from *${qualifiedCount}* participants who hit their sleep goal (${GRAND_PRIZE_THRESHOLD_HOURS_SERVER}+ hours). What an incredible December! 🎉`
        }]
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🙏 THANK YOU TO EVERYONE WHO PARTICIPATED!*\n\nYou all crushed it this month. Whether you won a prize or not, you invested in your sleep health—and that's the real win. 💪\n\n_See you at the next challenge!_ 🚀`
        }
      }
    ];

    await postToSlack(blocks);

    res.json({
      success: true,
      message: "Grand prize winner announced to Slack!",
      winner: {
        name: prize.winner_name,
        emoji: prize.winner_emoji,
        team: prize.team_name,
        totalHours: parseFloat(prize.total_hours)
      },
      qualifiedCount
    });
  } catch (err: any) {
    console.error("Grand Prize Announce Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ END GRAND PRIZE ENDPOINTS ============

// ============ CHALLENGE FINALE ENDPOINTS ============

// Preview challenge stats (no Slack post - for debugging)
app.get('/api/challenge/stats', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });

  try {
    const stats = await gatherChallengeStats(pool);
    res.json(stats);
  } catch (err: any) {
    console.error("Challenge Stats Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Send countdown/preview post to Slack - "Last chance to log your entries!"
app.post('/api/challenge/countdown', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });

  try {
    const result = await sendGrandPrizeCountdownPost(pool);
    res.json(result);
  } catch (err: any) {
    console.error("Countdown Post Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Send epic finale announcement with grand prize winner, stats, and awards
app.post('/api/challenge/finale', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });

  try {
    const result = await sendEpicFinaleAnnouncement(pool);
    res.json(result);
  } catch (err: any) {
    console.error("Finale Announcement Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============ END CHALLENGE FINALE ENDPOINTS ============

// Announce an already-drawn winner to Slack (for manual announcements)
app.post('/api/prizes/:week/announce', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const weekNumber = parseInt(req.params.week);

  if (weekNumber < 1 || weekNumber > 4) {
    return res.status(400).json({ error: "Week must be 1-4" });
  }

  try {
    // Get the prize with winner info
    const prizeRes = await pool.query(`
      SELECT p.*, u.username as winner_name, u.avatar_emoji as winner_emoji,
             u.slack_user_id, t.name as team_name, t.icon as team_icon
      FROM prizes p
      LEFT JOIN users u ON p.winner_user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE p.week_number = $1 AND p.prize_type = 'weekly'
    `, [weekNumber]);

    if (prizeRes.rows.length === 0) {
      return res.status(404).json({ error: `No prize found for week ${weekNumber}` });
    }

    const prize = prizeRes.rows[0];

    if (!prize.winner_user_id) {
      return res.status(400).json({ error: `Week ${weekNumber} prize has not been drawn yet` });
    }

    // Get count of qualified entrants for context
    const entriesRes = await pool.query(`
      SELECT COUNT(*) as count FROM prize_entries
      WHERE prize_id = $1 AND qualified = TRUE AND opted_in = TRUE
    `, [prize.id]);
    const qualifiedCount = parseInt(entriesRes.rows[0].count);

    // Build announcement blocks
    const winnerMention = prize.slack_user_id
      ? `<@${prize.slack_user_id}>`
      : `*${prize.winner_name}*`;

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🎉 WEEK ${weekNumber} PRIZE WINNER! 🎉`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Congratulations ${winnerMention}!* ${prize.winner_emoji}\n\nYou've won the *${prize.emoji} ${prize.title}*!\n${prize.team_icon} ${prize.team_name}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `_${prize.description}_`
        }
      },
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: `🎲 Randomly selected from *${qualifiedCount}* qualified participants who hit ${RAFFLE_THRESHOLD_HOURS_SERVER} hours during Week ${weekNumber}. Great job everyone! 👏`
        }]
      }
    ];

    await postToSlack(blocks);

    res.json({
      success: true,
      message: `Announced Week ${weekNumber} winner to Slack`,
      winner: {
        name: prize.winner_name,
        emoji: prize.winner_emoji,
        team: prize.team_name
      },
      prize: prize.title,
      qualifiedCount
    });
  } catch (err: any) {
    console.error("Prize Announce Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// December Challenge Reset - Delete old logs, recalculate hours, reset prizes
app.post('/api/december-reset', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    console.log("Starting December Challenge Reset...");
    const results: string[] = [];

    // Step 1: Count logs before deletion
    const beforeCount = await pool.query('SELECT COUNT(*) as count FROM sleep_logs');
    const oldLogsCount = await pool.query("SELECT COUNT(*) as count FROM sleep_logs WHERE date_logged < '2025-12-01'");
    results.push(`Logs before cleanup: ${beforeCount.rows[0].count}`);
    results.push(`Logs before Dec 1 (to delete): ${oldLogsCount.rows[0].count}`);

    // Step 2: Delete old sleep logs
    await pool.query("DELETE FROM sleep_logs WHERE date_logged < '2025-12-01'");
    results.push("Deleted old sleep logs");

    // Step 3: Recalculate banked_hours for all users
    await pool.query(`
      UPDATE users SET banked_hours = COALESCE(
        (SELECT SUM(sleep_hours) FROM sleep_logs WHERE user_id = users.id),
        0
      )
    `);
    results.push("Recalculated banked_hours for all users");

    // Step 4: Reset prize participation flags
    await pool.query('UPDATE users SET raffle_tickets = 0, grand_prize_entry = FALSE');
    results.push("Reset raffle_tickets and grand_prize_entry for all users");

    // Step 5: Clear prize entries
    await pool.query('TRUNCATE prize_entries RESTART IDENTITY CASCADE');
    results.push("Cleared prize_entries table");

    // Step 6: Reset prize winners (keep prize definitions)
    await pool.query('UPDATE prizes SET winner_user_id = NULL, drawn_at = NULL');
    results.push("Reset prize winners");

    // Verification
    const afterCount = await pool.query('SELECT COUNT(*) as count FROM sleep_logs');
    const userHours = await pool.query('SELECT username, banked_hours FROM users ORDER BY username');
    results.push(`Logs after cleanup: ${afterCount.rows[0].count}`);
    results.push(`User hours: ${JSON.stringify(userHours.rows)}`);

    console.log("December Challenge Reset Complete:", results);
    res.json({ success: true, message: "December Challenge Reset Complete", details: results });
  } catch (err: any) {
    console.error("December Reset Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// SAFE: Reseed only prizes (doesn't touch users, teams, or sleep_logs)
app.post('/api/reseed-prizes', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    console.log("Reseeding prizes only...");

    // Clear only prize tables
    await pool.query('TRUNCATE prizes, prize_entries RESTART IDENTITY CASCADE');

    // Reseed prizes with the updated sleep challenge data
    const prizes = [
      {
        week_number: 1,
        prize_type: 'weekly',
        title: 'Hatch Restore 2',
        description: 'The ultimate sunrise alarm clock + sound machine',
        emoji: '🌅'
      },
      {
        week_number: 2,
        prize_type: 'weekly',
        title: 'Total Blackout Bundle',
        description: 'Manta Sleep Mask PRO + SleepPhones Wireless + This Works Pillow Spray',
        emoji: '🌑'
      },
      {
        week_number: 3,
        prize_type: 'weekly',
        title: 'Recovery & Relaxation Kit',
        description: 'Theragun Mini + aromatherapy diffuser + essential oils',
        emoji: '💆'
      },
      {
        week_number: 4,
        prize_type: 'weekly',
        title: 'Cozy Sleep Upgrade',
        description: 'Weighted blanket + silk pillowcase + magnesium supplements + sleep tea',
        emoji: '☁️'
      },
      {
        week_number: null,
        prize_type: 'grand',
        title: 'Ultimate Sleep Setup OR Sleeper\'s Choice',
        description: 'Complete sleep tech bundle (Hatch + Manta + SleepPhones + weighted blanket + supplements) OR $300 to spend on any sleep products you want!',
        emoji: '👑'
      }
    ];

    for (const prize of prizes) {
      await pool.query(
        'INSERT INTO prizes (week_number, prize_type, title, description, emoji) VALUES ($1, $2, $3, $4, $5)',
        [prize.week_number, prize.prize_type, prize.title, prize.description, prize.emoji]
      );
    }

    res.json({ success: true, message: "Prizes reseeded successfully (users and sleep logs untouched)" });
  } catch (err: any) {
    console.error("Reseed Prizes Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  try {
    const result = await pool.query('SELECT * FROM sleep_logs ORDER BY date_logged DESC, created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    console.error("Get Logs Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const { 
    user_id, 
    date_logged, 
    bedtime, 
    wake_time, 
    sleep_hours, 
    quality_rating, 
    notes, 
    screenshot_url,
    metrics 
  } = req.body;
  
  // Extract metrics if provided
  const sleep_score = metrics?.sleep_score || null;
  const deep_sleep_min = metrics?.deep_sleep_min || null;
  const rem_sleep_min = metrics?.rem_sleep_min || null;
  const light_sleep_min = metrics?.light_sleep_min || null;
  const awake_min = metrics?.awake_min || null;
  const sleep_latency_min = metrics?.sleep_latency_min || null;

  try {
    // 1. Get total company sleep hours BEFORE this log (for December challenge only)
    const beforeRes = await pool.query(`
      SELECT COALESCE(SUM(sleep_hours), 0) as total
      FROM sleep_logs
      WHERE date_logged >= '2025-12-01' AND date_logged <= '2025-12-31'
    `);
    const previousTotalHours = parseFloat(beforeRes.rows[0].total);

    // 2. Insert the log and get the ID back
    const logResult = await pool.query(
      `INSERT INTO sleep_logs (
        user_id, date_logged, bedtime, wake_time, sleep_hours, 
        quality_rating, notes, screenshot_url,
        sleep_score, deep_sleep_min, rem_sleep_min, light_sleep_min, awake_min, sleep_latency_min
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [user_id, date_logged, bedtime, wake_time, sleep_hours, quality_rating, notes, screenshot_url,
       sleep_score, deep_sleep_min, rem_sleep_min, light_sleep_min, awake_min, sleep_latency_min]
    );
    const logId = logResult.rows[0].id;

    // 3. Update user's banked_hours
    await pool.query(
      'UPDATE users SET banked_hours = banked_hours + $1 WHERE id = $2',
      [sleep_hours, user_id]
    );

    // 4. Calculate new total (only if log is within December challenge)
    const isDecemberLog = date_logged >= '2025-12-01' && date_logged <= '2025-12-31';
    const newTotalHours = isDecemberLog ? previousTotalHours + parseFloat(sleep_hours) : previousTotalHours;

    // 5. Check for 50% milestone crossing (async, don't block response)
    if (isDecemberLog) {
      checkAndAnnounceMilestone(pool, user_id, logId, previousTotalHours, newTotalHours).catch(err => {
        console.error("Milestone check error:", err);
      });
    }

    // 6. Async Slack Notification for the log itself
    const userRes = await pool.query(
        'SELECT u.username, u.banked_hours, t.name as team_name, t.icon as team_icon FROM users u JOIN teams t ON u.team_id = t.id WHERE u.id = $1',
        [user_id]
    );
    if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        // Calculate daily total for the logged date
        const dailyRes = await pool.query(
          'SELECT COALESCE(SUM(sleep_hours), 0) as daily_total FROM sleep_logs WHERE user_id = $1 AND date_logged = $2',
          [user_id, date_logged]
        );
        const dailyTotal = parseFloat(dailyRes.rows[0]?.daily_total || '0');
        sendSlackLog(u.username, u.team_name, u.team_icon || '👥', sleep_hours, notes || 'Sleep logged', dailyTotal, parseFloat(u.banked_hours), date_logged).catch(console.error);
    }

    // 7. Auto opt-in for weekly prize and grand prize (async, don't block response)
    if (isDecemberLog) {
      autoOptInUserForPrizes(pool, user_id).catch(err => {
        console.error("Auto opt-in error:", err);
      });
    }

    res.json({ success: true, id: logId });
  } catch (err: any) {
    console.error("Post Log Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update an existing sleep log
app.patch('/api/logs/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const logId = parseInt(req.params.id);
  const { 
    sleep_hours, 
    bedtime, 
    wake_time, 
    quality_rating, 
    notes, 
    date_logged,
    screenshot_url,
    metrics
  } = req.body;

  try {
    // First, get the old log to calculate hours difference
    const oldLogRes = await pool.query('SELECT * FROM sleep_logs WHERE id = $1', [logId]);
    if (oldLogRes.rows.length === 0) {
      return res.status(404).json({ error: "Log entry not found" });
    }
    const oldLog = oldLogRes.rows[0];
    const hoursDifference = parseFloat(sleep_hours) - parseFloat(oldLog.sleep_hours);

    // Extract metrics if provided
    const sleep_score = metrics?.sleep_score ?? oldLog.sleep_score;
    const deep_sleep_min = metrics?.deep_sleep_min ?? oldLog.deep_sleep_min;
    const rem_sleep_min = metrics?.rem_sleep_min ?? oldLog.rem_sleep_min;
    const light_sleep_min = metrics?.light_sleep_min ?? oldLog.light_sleep_min;
    const awake_min = metrics?.awake_min ?? oldLog.awake_min;
    const sleep_latency_min = metrics?.sleep_latency_min ?? oldLog.sleep_latency_min;

    // Update the log entry
    await pool.query(
      `UPDATE sleep_logs SET 
        sleep_hours = $1, bedtime = $2, wake_time = $3, quality_rating = $4, 
        notes = $5, date_logged = $6, screenshot_url = $7,
        sleep_score = $8, deep_sleep_min = $9, rem_sleep_min = $10, 
        light_sleep_min = $11, awake_min = $12, sleep_latency_min = $13
      WHERE id = $14`,
      [sleep_hours, bedtime, wake_time, quality_rating, notes, date_logged, screenshot_url,
       sleep_score, deep_sleep_min, rem_sleep_min, light_sleep_min, awake_min, sleep_latency_min,
       logId]
    );

    // Update user's banked_hours with the difference
    await pool.query(
      'UPDATE users SET banked_hours = banked_hours + $1 WHERE id = $2',
      [hoursDifference, oldLog.user_id]
    );

    // Auto opt-in for prizes (async, in case update pushes user over threshold)
    const isDecemberLog = date_logged >= '2025-12-01' && date_logged <= '2025-12-31';
    if (isDecemberLog && hoursDifference > 0) {
      autoOptInUserForPrizes(pool, oldLog.user_id).catch(err => {
        console.error("Update log auto opt-in error:", err);
      });
    }

    res.json({ success: true, message: `Log ${logId} updated successfully` });
  } catch (err: any) {
    console.error("Update Log Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a sleep log
app.delete('/api/logs/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const logId = parseInt(req.params.id);

  try {
    // First, get the log to subtract hours from user's banked_hours
    const logRes = await pool.query('SELECT * FROM sleep_logs WHERE id = $1', [logId]);
    if (logRes.rows.length === 0) {
      return res.status(404).json({ error: "Log entry not found" });
    }
    const log = logRes.rows[0];

    // Delete the log entry
    await pool.query('DELETE FROM sleep_logs WHERE id = $1', [logId]);

    // Subtract the hours from user's banked_hours
    await pool.query(
      'UPDATE users SET banked_hours = banked_hours - $1 WHERE id = $2',
      [log.sleep_hours, log.user_id]
    );

    res.json({ success: true, message: `Log ${logId} deleted successfully` });
  } catch (err: any) {
    console.error("Delete Log Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/raffle', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET raffle_tickets = 1 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Raffle Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/grandprize', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET grand_prize_entry = TRUE WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Grand Prize Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Database not connected" });
  const { username, team_id } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND team_id = $2', [username, team_id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err: any) {
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// SPA Fallback: If no API route matches, serve the React App (index.html)
// Express 5 requires explicit catch-all pattern
app.use((req, res) => {
    const indexPath = process.env.NODE_ENV === 'production'
        ? path.join(path.resolve('./dist'), 'index.html')
        : path.join(path.resolve('.'), 'index.html');
    res.sendFile(indexPath);
});

// Start Server
// CRITICAL: Bind to 0.0.0.0 and use process.env.PORT for Cloud Run
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
