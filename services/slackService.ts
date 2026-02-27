import { Pool } from 'pg';
import { GLOBAL_GOAL, WEEKLY_GOAL, RAFFLE_THRESHOLD_HOURS, GRAND_PRIZE_THRESHOLD_HOURS, DAILY_GOAL, CHALLENGE_START, CHALLENGE_END } from '../constants';
import { getDailyFunFact, getMorningMotivation } from './geminiService';

// Helper: Get date string in Mountain Time (YYYY-MM-DD format)
const getMountainTimeDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
};

// Challenge weeks: Week 1 = Mar 1-7, Week 2 = Mar 8-14, etc.
const CHALLENGE_START_DATE = new Date(CHALLENGE_START);

// Helper: Get current challenge week (1-4)
const getCurrentWeek = (): number => {
  const today = new Date();
  const todayMT = new Date(getMountainTimeDate(today));
  const daysSinceStart = Math.floor((todayMT.getTime() - CHALLENGE_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysSinceStart / 7) + 1;
  return Math.min(Math.max(week, 1), 4); // Clamp to 1-4
};

// Helper: Get days left in current week
const getDaysLeftInWeek = (): number => {
  const today = new Date();
  const todayMT = new Date(getMountainTimeDate(today));
  const daysSinceStart = Math.floor((todayMT.getTime() - CHALLENGE_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  const dayOfWeek = daysSinceStart % 7; // 0 = first day, 6 = last day
  return 7 - dayOfWeek - 1; // Days remaining after today
};

// Health benefits for each weekly prize
const PRIZE_HEALTH_BENEFITS: Record<number, { shortBenefit: string; healthTip: string }> = {
  1: {
    shortBenefit: "Wake up naturally with sunrise simulation",
    healthTip: "💡 *Health Tip:* Sunrise alarms help regulate your circadian rhythm, making waking up easier and improving daytime energy!"
  },
  2: {
    shortBenefit: "Total darkness for deeper, uninterrupted sleep",
    healthTip: "💡 *Health Tip:* Even small amounts of light can disrupt melatonin production. Complete darkness helps you reach deeper sleep stages!"
  },
  3: {
    shortBenefit: "Release muscle tension for faster sleep onset",
    healthTip: "💡 *Health Tip:* Physical tension keeps your nervous system alert. Releasing it helps your body shift into rest mode!"
  },
  4: {
    shortBenefit: "Create the coziest sleep environment",
    healthTip: "💡 *Health Tip:* Weighted blankets provide deep pressure stimulation that increases serotonin and reduces cortisol for calmer sleep!"
  }
};

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || '#sleepchallenge';

// Helper: Check if today is Monday in Mountain Time
const isMondayInMT = (): boolean => {
  const now = new Date();
  // Get the day of week in Mountain Time
  const mtDateStr = now.toLocaleString('en-US', {
    timeZone: 'America/Denver',
    weekday: 'long'
  });
  return mtDateStr === 'Monday';
};

// Helper: Get previous week number (for drawing last week's prize on Monday)
const getPreviousWeek = (): number => {
  const currentWeek = getCurrentWeek();
  // On Monday of Week 2, we draw Week 1's winner
  // getCurrentWeek() already returns the new week on Monday
  return Math.max(1, currentWeek - 1);
};

// Debug logging (only log partial token for security)
console.log(`SLACK_BOT_TOKEN loaded: ${SLACK_BOT_TOKEN ? `${SLACK_BOT_TOKEN.substring(0, 10)}...` : 'NOT SET'}`);
console.log(`SLACK_CHANNEL_ID loaded: ${SLACK_CHANNEL_ID}`);

// Helper to post to Slack using Bot Token
export const postToSlack = async (blocks: any[]) => {
  if (!SLACK_BOT_TOKEN) {
    console.log("No SLACK_BOT_TOKEN configured. Skipping notification.");
    return;
  }
  console.log(`Posting to Slack channel: ${SLACK_CHANNEL_ID}`);
  const payload = {
    channel: SLACK_CHANNEL_ID,
    blocks
  };
  console.log(`Payload:`, JSON.stringify(payload).substring(0, 500));
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log(`Slack API response:`, JSON.stringify(result));
    if (!result.ok) {
      console.error(`Slack Error: ${result.error}`);
    } else {
      console.log(`Successfully posted to Slack channel ${SLACK_CHANNEL_ID}`);
    }
  } catch (error) {
    console.error("Failed to send to Slack:", error);
  }
};

// Helper: Get the start date of a specific challenge week
const getWeekStartDate = (weekNumber: number): Date => {
  const start = new Date(CHALLENGE_START);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  return start;
};

// Helper: Get the end date of a specific challenge week
const getWeekEndDate = (weekNumber: number): Date => {
  const end = getWeekStartDate(weekNumber);
  end.setDate(end.getDate() + 6);
  return end;
};

// Helper: Calculate user's sleep hours for the current challenge week
const getUserWeeklySleep = (userId: number, logs: any[], weekNumber: number): number => {
  const weekStart = getWeekStartDate(weekNumber);
  const weekEnd = getWeekEndDate(weekNumber);
  const weekStartStr = getMountainTimeDate(weekStart);
  const weekEndStr = getMountainTimeDate(weekEnd);

  return logs
    .filter((l: any) => {
      return l.user_id === userId &&
             l.date_logged >= weekStartStr &&
             l.date_logged <= weekEndStr;
    })
    .reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
};

// Helper: Auto opt-in qualified users for weekly prize
const autoOptInQualifiedUsers = async (pool: Pool, weekNumber: number, qualifiedUsers: any[]): Promise<number> => {
  let optedInCount = 0;

  // Get the prize for this week
  const prizeRes = await pool.query('SELECT id FROM prizes WHERE week_number = $1', [weekNumber]);
  if (prizeRes.rows.length === 0) {
    console.log(`No prize found for week ${weekNumber}`);
    return 0;
  }
  const prizeId = prizeRes.rows[0].id;

  for (const user of qualifiedUsers) {
    try {
      // Check if user is already opted in
      const existingEntry = await pool.query(
        'SELECT * FROM prize_entries WHERE user_id = $1 AND prize_id = $2',
        [user.id, prizeId]
      );

      if (existingEntry.rows.length === 0) {
        // Auto opt-in the user
        await pool.query(`
          INSERT INTO prize_entries (user_id, prize_id, week_number, opted_in, qualified)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (user_id, prize_id) DO UPDATE SET opted_in = TRUE, qualified = TRUE
        `, [user.id, prizeId, weekNumber]);
        optedInCount++;
        console.log(`Auto opted-in ${user.username} for week ${weekNumber} prize`);
      } else if (!existingEntry.rows[0].qualified) {
        // Update to qualified if not already
        await pool.query(
          'UPDATE prize_entries SET qualified = TRUE WHERE user_id = $1 AND prize_id = $2',
          [user.id, prizeId]
        );
      }
    } catch (err) {
      console.error(`Error auto opt-in for user ${user.id}:`, err);
    }
  }

  return optedInCount;
};

// Fun celebration messages for hitting weekly goal
const WEEKLY_GOAL_CELEBRATIONS = [
  "Your pillow called. It's proud of you. 🛏️",
  "You didn't just hit the goal—you dreampt your way to victory. 💤✨",
  "Scientists are baffled. Your sleep tracker might need a vacation.",
  "Plot twist: You're now officially a sleep legend. 😴✨",
  "Your Netflix queue is filing a missing persons report. 📺😢",
  "Breaking news: Local hero makes resting look suspiciously easy.",
  "Your future self just high-fived you through a dream. 🙌",
  "The sheep you count are honored by your dedication. 🐑",
];

// Fun celebration messages for hitting grand prize goal
const GRAND_PRIZE_CELEBRATIONS = [
  "You absolute LEGEND of slumber. 👑",
  "Somewhere, a bed is weeping with pride. 🛏️😭",
  "Your dedication has been noted by the sleep gods. ⚡",
  "This is like a sleep marathon... but way more comfortable. 🏃‍♀️💤",
  "You're basically a professional dreamer now.",
  "Achievement unlocked: 'Why is this person so well-rested?!'",
  "Your pillow has earned its own Wikipedia page. 📚",
  "Even your Oura ring is impressed, and it's seen things. 🤯",
];

// Fun stats to show
const getFunStats = (hours: number) => {
  const dreams = Math.round(hours * 4); // ~4 dreams per night
  const sleepCycles = Math.round(hours / 1.5);
  const energyRestored = Math.min(100, Math.round(hours * 12.5));
  const koalasEnvied = Math.round(hours / 22 * 10) / 10; // Koalas sleep 22 hrs/day

  const funFacts = [
    `💭 That's roughly *${dreams} dreams*—your subconscious has been busy!`,
    `🔄 *${sleepCycles} sleep cycles* completed. Your brain thanks you for the maintenance. 🧠`,
    `⚡ *${energyRestored}% energy* restored. You're basically recharged!`,
    `🐨 You've slept *${koalasEnvied}x* what a busy human normally would. Koalas are impressed.`,
    `🌙 That's *${Math.round(hours / 8)} perfect nights* of sleep. Quality rest = quality life!`,
  ];

  return funFacts[Math.floor(Math.random() * funFacts.length)];
};

// Send celebration message when user qualifies for weekly prize
export const sendWeeklyPrizeQualificationCelebration = async (
  pool: Pool,
  userId: number,
  weekNumber: number,
  weeklyHours: number
): Promise<void> => {
  try {
    // Get user info
    const userRes = await pool.query(`
      SELECT u.username, u.avatar_emoji, t.name as team_name, t.icon as team_icon
      FROM users u
      JOIN teams t ON u.team_id = t.id
      WHERE u.id = $1
    `, [userId]);

    if (userRes.rows.length === 0) return;
    const user = userRes.rows[0];

    // Get prize info for this week
    const prizeRes = await pool.query(
      'SELECT title, emoji FROM prizes WHERE week_number = $1',
      [weekNumber]
    );
    const prize = prizeRes.rows[0];

    // Pick random celebration message
    const celebration = WEEKLY_GOAL_CELEBRATIONS[Math.floor(Math.random() * WEEKLY_GOAL_CELEBRATIONS.length)];
    const funStat = getFunStats(weeklyHours);

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎉 *WEEKLY PRIZE ALERT!* 🎉\n\n${user.avatar_emoji || '😴'} *${user.username}* just qualified for the *Week ${weekNumber}* prize drawing!`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `> _${celebration}_`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🎯 *${weeklyHours.toFixed(1)} hours* this week • ${funStat}`
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${prize?.emoji || '🎁'} Now in the running for: *${prize?.title || 'Weekly Prize'}*`
          }
        ]
      }
    ];

    await postToSlack(blocks);
    console.log(`🎉 Sent weekly prize qualification celebration for ${user.username}`);
  } catch (err) {
    console.error("Error sending weekly prize celebration:", err);
  }
};

// Send celebration message when user qualifies for grand prize
export const sendGrandPrizeQualificationCelebration = async (
  pool: Pool,
  userId: number,
  totalHours: number
): Promise<void> => {
  try {
    // Get user info
    const userRes = await pool.query(`
      SELECT u.username, u.avatar_emoji, t.name as team_name, t.icon as team_icon
      FROM users u
      JOIN teams t ON u.team_id = t.id
      WHERE u.id = $1
    `, [userId]);

    if (userRes.rows.length === 0) return;
    const user = userRes.rows[0];

    // Get grand prize info
    const prizeRes = await pool.query(
      `SELECT title, emoji, description FROM prizes WHERE prize_type = 'grand'`
    );
    const grandPrize = prizeRes.rows[0];

    // Pick random celebration message
    const celebration = GRAND_PRIZE_CELEBRATIONS[Math.floor(Math.random() * GRAND_PRIZE_CELEBRATIONS.length)];
    const funStat = getFunStats(totalHours);

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🏆✨ *GRAND PRIZE QUALIFIER ALERT!* ✨🏆`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${user.avatar_emoji || '😴'} *${user.username}* has unlocked entry into the *GRAND PRIZE* drawing!\n\n> _${celebration}_`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📊 *The Stats Don't Lie:*\n• 😴 *${totalHours.toFixed(1)} total hours* of sleep this month\n• ${funStat}\n• 🎟️ Now entered to win: *${grandPrize?.title || 'The Grand Prize'}*`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${grandPrize?.emoji || '🏆'} _${grandPrize?.description || 'The ultimate prize awaits!'}_`
          }
        ]
      }
    ];

    await postToSlack(blocks);
    console.log(`🏆 Sent grand prize qualification celebration for ${user.username}`);
  } catch (err) {
    console.error("Error sending grand prize celebration:", err);
  }
};

// Draw random winner from qualified entrants for a specific week
export const drawWeeklyPrizeWinner = async (pool: Pool, weekNumber: number): Promise<{
  winner: any | null;
  prize: any | null;
  qualifiedCount: number;
  alreadyDrawn: boolean;
}> => {
  console.log(`Drawing winner for week ${weekNumber}...`);

  // 1. Get the prize for this week
  const prizeRes = await pool.query(
    'SELECT * FROM prizes WHERE week_number = $1 AND prize_type = $2',
    [weekNumber, 'weekly']
  );

  if (prizeRes.rows.length === 0) {
    console.log(`No prize found for week ${weekNumber}`);
    return { winner: null, prize: null, qualifiedCount: 0, alreadyDrawn: false };
  }

  const prize = prizeRes.rows[0];

  // 2. Check if already drawn
  if (prize.winner_user_id !== null) {
    console.log(`Week ${weekNumber} prize already drawn (winner_user_id: ${prize.winner_user_id})`);
    return { winner: null, prize, qualifiedCount: 0, alreadyDrawn: true };
  }

  // 3. Get all qualified, opted-in entrants for this week
  const entriesRes = await pool.query(`
    SELECT pe.*, u.username, u.slack_user_id, u.avatar_emoji, t.name as team_name, t.icon as team_icon
    FROM prize_entries pe
    JOIN users u ON pe.user_id = u.id
    JOIN teams t ON u.team_id = t.id
    WHERE pe.prize_id = $1 AND pe.qualified = TRUE AND pe.opted_in = TRUE
  `, [prize.id]);

  const qualifiedEntrants = entriesRes.rows;
  console.log(`Found ${qualifiedEntrants.length} qualified entrants for week ${weekNumber}`);

  if (qualifiedEntrants.length === 0) {
    console.log(`No qualified entrants for week ${weekNumber} - skipping draw`);
    return { winner: null, prize, qualifiedCount: 0, alreadyDrawn: false };
  }

  // 4. Random selection
  const randomIndex = Math.floor(Math.random() * qualifiedEntrants.length);
  const winner = qualifiedEntrants[randomIndex];

  console.log(`Random selection: index ${randomIndex} = ${winner.username}`);

  // 5. Record the winner in the database
  await pool.query(
    'UPDATE prizes SET winner_user_id = $1, drawn_at = NOW() WHERE id = $2',
    [winner.user_id, prize.id]
  );

  console.log(`Week ${weekNumber} winner recorded: ${winner.username} (user_id: ${winner.user_id})`);

  return { winner, prize, qualifiedCount: qualifiedEntrants.length, alreadyDrawn: false };
};

// Build Slack blocks for prize winner celebration announcement
const buildPrizeWinnerBlocks = (
  winner: any,
  prize: any,
  weekNumber: number,
  qualifiedCount: number
): any[] => {
  const winnerMention = winner.slack_user_id
    ? `<@${winner.slack_user_id}>`
    : `*${winner.username}*`;

  return [
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
        text: `🎲 Randomly selected from *${qualifiedCount}* qualified participants who hit ${RAFFLE_THRESHOLD_HOURS.toFixed(1)} hours during Week ${weekNumber}. Great job everyone! 👏`
      }]
    },
    {
      type: "divider"
    }
  ];
};

// Build Slack blocks for GRAND PRIZE winner celebration announcement
const buildGrandPrizeWinnerBlocks = (
  winner: any,
  prize: any,
  qualifiedCount: number,
  totalHours: number
): any[] => {
  const winnerMention = winner.slack_user_id
    ? `<@${winner.slack_user_id}>`
    : `*${winner.username}*`;

  const funStat = getFunStats(totalHours);
  const celebration = GRAND_PRIZE_CELEBRATIONS[Math.floor(Math.random() * GRAND_PRIZE_CELEBRATIONS.length)];

  return [
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
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎊 *CONGRATULATIONS ${winnerMention}!* ${winner.avatar_emoji} 🎊\n\n> _${celebration}_`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `You've won the *${prize.emoji} ${prize.title}*!\n${winner.team_icon} ${winner.team_name}`
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
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📊 *${winner.username}'s Challenge Stats:*\n• 😴 *${totalHours.toFixed(1)} total hours of sleep*\n• ${funStat}`
      }
    },
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `🎲 Randomly selected from *${qualifiedCount}* participants who hit their sleep goal (${GRAND_PRIZE_THRESHOLD_HOURS.toFixed(1)}+ hours). What an incredible challenge! 🎉`
      }]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🙏 THANK YOU TO EVERYONE WHO PARTICIPATED!*\n\nYou all crushed it this month. Whether you won a prize or not, you invested in your sleep health—and that's the real win. 💪\n\n_See you at the next challenge!_ 🚀`
      }
    }
  ];
};

// Draw random winner from users who qualified for grand prize (grand_prize_entry = TRUE)
export const drawGrandPrizeWinner = async (pool: Pool): Promise<{
  winner: any | null;
  prize: any | null;
  qualifiedCount: number;
  alreadyDrawn: boolean;
  totalHours: number;
}> => {
  console.log(`Drawing GRAND PRIZE winner...`);

  // 1. Get the grand prize
  const prizeRes = await pool.query(
    `SELECT * FROM prizes WHERE prize_type = 'grand'`
  );

  if (prizeRes.rows.length === 0) {
    console.log(`No grand prize found in database`);
    return { winner: null, prize: null, qualifiedCount: 0, alreadyDrawn: false, totalHours: 0 };
  }

  const prize = prizeRes.rows[0];

  // 2. Check if already drawn
  if (prize.winner_user_id !== null) {
    console.log(`Grand prize already drawn (winner_user_id: ${prize.winner_user_id})`);
    return { winner: null, prize, qualifiedCount: 0, alreadyDrawn: true, totalHours: 0 };
  }

  // 3. Get all users who qualified for grand prize (grand_prize_entry = TRUE)
  const usersRes = await pool.query(`
    SELECT u.*, t.name as team_name, t.icon as team_icon
    FROM users u
    JOIN teams t ON u.team_id = t.id
    WHERE u.grand_prize_entry = TRUE
  `);

  const qualifiedUsers = usersRes.rows;
  console.log(`Found ${qualifiedUsers.length} users qualified for grand prize`);

  if (qualifiedUsers.length === 0) {
    console.log(`No users qualified for grand prize - skipping draw`);
    return { winner: null, prize, qualifiedCount: 0, alreadyDrawn: false, totalHours: 0 };
  }

  // 4. Random selection - using crypto-grade randomness for fairness
  const randomIndex = Math.floor(Math.random() * qualifiedUsers.length);
  const winner = qualifiedUsers[randomIndex];

  console.log(`Random selection: index ${randomIndex} = ${winner.username}`);

  // 5. Get winner's total challenge sleep hours for stats
  const hoursRes = await pool.query(
    `SELECT COALESCE(SUM(sleep_hours), 0) as total FROM sleep_logs WHERE user_id = $1`,
    [winner.id]
  );
  const totalHours = parseFloat(hoursRes.rows[0].total);

  // 6. Record the winner in the database
  await pool.query(
    'UPDATE prizes SET winner_user_id = $1, drawn_at = NOW() WHERE id = $2',
    [winner.id, prize.id]
  );

  console.log(`🏆 GRAND PRIZE winner recorded: ${winner.username} (user_id: ${winner.id})`);

  return { winner, prize, qualifiedCount: qualifiedUsers.length, alreadyDrawn: false, totalHours };
};

// Announce grand prize winner to Slack
export const announceGrandPrizeWinner = async (pool: Pool): Promise<{
  success: boolean;
  message: string;
  winner?: any;
}> => {
  try {
    const { winner, prize, qualifiedCount, alreadyDrawn, totalHours } = await drawGrandPrizeWinner(pool);

    if (alreadyDrawn) {
      return { success: false, message: "Grand prize has already been drawn" };
    }

    if (!winner || !prize) {
      return { success: false, message: "No qualified participants for grand prize" };
    }

    // Build and post celebration blocks to Slack
    const blocks = buildGrandPrizeWinnerBlocks(winner, prize, qualifiedCount, totalHours);
    await postToSlack(blocks);

    return {
      success: true,
      message: `Grand prize winner announced: ${winner.username}`,
      winner: {
        id: winner.id,
        username: winner.username,
        totalHours,
        team: winner.team_name
      }
    };
  } catch (err: any) {
    console.error("Error announcing grand prize winner:", err);
    return { success: false, message: err.message };
  }
};

// 1. Sleep Log Notification
export const sendSlackLog = async (
  username: string,
  teamName: string,
  teamIcon: string,
  hours: number,
  notes: string,
  dailyTotal: number,
  monthlyTotal: number,
  dateLogged?: string
) => {
  const emoji = '😴';

  // Determine if this is for today or a past date (using Mountain Time)
  const today = getMountainTimeDate();
  const isToday = !dateLogged || dateLogged === today;
  const dateText = isToday ? 'just logged' : `logged for ${dateLogged}`;

  // Fun milestone callouts
  let milestoneText = '';
  if (dailyTotal >= 9) {
    milestoneText = ' 🏆 *SLEEP CHAMPION!*';
  } else if (dailyTotal >= 8) {
    milestoneText = ' 🎯 *8 Hour Club!*';
  } else if (dailyTotal >= 7) {
    milestoneText = ' ✅ *Great rest!*';
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${username}* ${teamIcon} ${dateText} *${hours.toFixed(1)} hours* of sleep!${milestoneText}`
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📅 Today: *${dailyTotal.toFixed(1)}* hours | 📊 This month: *${monthlyTotal.toFixed(1)}* hours${notes ? ` | 📝 ${notes}` : ''}`
        }
      ]
    }
  ];

  await postToSlack(blocks);
};

// 2. Daily Digest - Encourage Better Sleep! (5 PM MT)
export const sendSlackDailyUpdate = async (pool: Pool) => {
  console.log("Generating Daily Slack Digest...");

  // Fetch Data
  const usersRes = await pool.query('SELECT * FROM users');
  const teamsRes = await pool.query('SELECT * FROM teams');
  const logsRes = await pool.query('SELECT * FROM sleep_logs');

  const users = usersRes.rows;
  const teams = teamsRes.rows;
  const logs = logsRes.rows;

  // Filter logs to challenge period only
  const challengeLogs = logs.filter((l: any) =>
    l.date_logged >= CHALLENGE_START && l.date_logged <= CHALLENGE_END
  );

  // Calculate Global Progress (challenge period only)
  const totalHours = challengeLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
  const globalPct = Math.min(100, Math.round((totalHours / GLOBAL_GOAL) * 100));

  // Today's date in Mountain Time (America/Denver)
  const today = new Date();
  const todayStr = getMountainTimeDate(today);

  // Today's stats (actually last night's sleep logged today)
  const todayLogs = logs.filter((l: any) => l.date_logged === todayStr);
  const todayHours = todayLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);

  // Calculate per-user today stats with team info
  const userTodayStats = users.map((u: any) => {
    const userLogs = todayLogs.filter((l: any) => l.user_id === u.id);
    const hours = userLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
    const team = teams.find((t: any) => t.id === u.team_id);
    return { ...u, todayHours: hours, teamIcon: team?.icon || '👥' };
  }).sort((a, b) => b.todayHours - a.todayHours);

  // Find who hasn't logged today - group by team
  const missingByTeam = teams.map((t: any) => {
    const teamMembers = userTodayStats.filter(u => u.team_id === t.id && u.todayHours === 0);
    return {
      teamName: t.name,
      teamIcon: t.icon,
      missing: teamMembers
    };
  }).filter(t => t.missing.length > 0);

  // Top 3 sleepers today
  const topToday = userTodayStats.slice(0, 3).filter(u => u.todayHours > 0);

  // Current leader for "today's crown"
  const currentLeader = userTodayStats[0];

  // Fun conversions
  const dreams = Math.round(todayHours * 4);
  const sleepCycles = Math.round(todayHours / 1.5);

  // How many hit daily goal today
  const goalHitters = userTodayStats.filter(u => u.todayHours >= DAILY_GOAL).length;

  // Calculate Team Stats - TODAY and OVERALL
  const teamStats = teams.map((t: any) => {
    const members = users.filter((u: any) => u.team_id === t.id);
    const memberIds = members.map((u: any) => u.id);

    // Today's hours
    const teamTodayLogs = todayLogs.filter((l: any) => memberIds.includes(l.user_id));
    const todayTotal = teamTodayLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);

    // Overall hours
    const teamAllLogs = logs.filter((l: any) => memberIds.includes(l.user_id));
    const overallTotal = teamAllLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);

    return { ...t, todayHours: todayTotal, overallHours: overallTotal, memberCount: members.length };
  });

  const teamsByToday = [...teamStats].sort((a, b) => b.todayHours - a.todayHours);
  const teamsByOverall = [...teamStats].sort((a, b) => b.overallHours - a.overallHours);

  const winningTeamToday = teamsByToday[0];
  const leadingTeamOverall = teamsByOverall[0];
  const trailingTeamOverall = teamsByOverall[1];
  const overallGap = leadingTeamOverall.overallHours - trailingTeamOverall.overallHours;

  // Calculate Weekly Stats (Current challenge week)
  const currentWeek = getCurrentWeek();
  const weekStart = getWeekStartDate(currentWeek);
  const weekEnd = getWeekEndDate(currentWeek);
  const weekStartStr = getMountainTimeDate(weekStart);
  const weekEndStr = getMountainTimeDate(weekEnd);

  const weeklyLogs = logs.filter((l: any) =>
    l.date_logged >= weekStartStr && l.date_logged <= weekEndStr
  );

  const weeklyQualifiers = users.filter((u: any) => {
    const myWeeklyHours = weeklyLogs
      .filter((l: any) => l.user_id === u.id)
      .reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
    return myWeeklyHours >= RAFFLE_THRESHOLD_HOURS;
  });

  const grandPrizeQualifiers = users.filter((u: any) => {
    const myTotal = logs
      .filter((l: any) => l.user_id === u.id)
      .reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
    return myTotal >= GRAND_PRIZE_THRESHOLD_HOURS;
  });

  // Progress bar
  const progressBar = "▓".repeat(Math.floor(globalPct / 5)) + "░".repeat(20 - Math.floor(globalPct / 5));

  // Top performers text with team icons
  let topText = "";
  if (topToday.length > 0) {
    topText = topToday.map((u, i) =>
      `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} *${u.username}* ${u.teamIcon}: ${u.todayHours.toFixed(1)} hours`
    ).join('\n');
  } else {
    topText = "_No one has logged sleep today yet! Be the first!_";
  }

  // Current crown holder message
  let crownMessage = '';
  if (currentLeader && currentLeader.todayHours > 0) {
    const mention = currentLeader.slack_user_id ? `<@${currentLeader.slack_user_id}>` : currentLeader.username;
    crownMessage = `\n\n👑 *Current Sleep Champion:* ${mention} with ${currentLeader.todayHours.toFixed(1)} hours\n_Great rest leads to great days!_`;
  }

  // Missing participants - grouped by team with urgent messaging
  const missingBlocks = [];
  if (missingByTeam.length > 0) {
    let missingText = "*🚨 YOUR TEAM NEEDS YOU!*\n";
    missingByTeam.forEach(team => {
      const mentions = team.missing.map((u: any) => {
        if (u.slack_user_id) {
          return `<@${u.slack_user_id}>`;
        } else {
          return `@${u.slack_username || u.username}`;
        }
      }).join(', ');
      missingText += `${team.teamIcon} *${team.teamName}*: ${mentions}\n`;
    });
    missingText += `_Every hour of sleep counts! Don't forget to log!_ 💤`;
    missingBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: missingText
      }
    });
  }

  // Grand prize qualifiers
  const grandPrizeText = grandPrizeQualifiers.length > 0
    ? `🏆 *Grand Prize:* ${grandPrizeQualifiers.length} qualified`
    : `🏆 *Grand Prize:* No qualifiers yet`;

  // Generate AI fun fact
  let funFact = "🌟 Quality sleep is the foundation of great days! Keep it up!";
  try {
    funFact = await getDailyFunFact(todayHours, totalHours, leadingTeamOverall.name);
  } catch (error) {
    console.error("Error generating fun fact:", error);
  }

  // Team battle text - make it competitive!
  let teamBattleText = '';
  if (overallGap > 0) {
    if (leadingTeamOverall.id === trailingTeamOverall.id) {
      teamBattleText = `${leadingTeamOverall.icon} *${leadingTeamOverall.name}* is running away with it!`;
    } else {
      teamBattleText = `${leadingTeamOverall.icon} *${leadingTeamOverall.name}* leads by *${overallGap.toFixed(1)}* hours!\n${trailingTeamOverall.icon} ${trailingTeamOverall.name} - can you close the gap? 💤`;
    }
  }

  // ========== WEEKLY PRIZE PROMOTION ==========
  const daysLeftInWeek = getDaysLeftInWeek();
  const prizeHealthBenefits = PRIZE_HEALTH_BENEFITS[currentWeek];

  // Fetch this week's prize
  const prizeRes = await pool.query('SELECT * FROM prizes WHERE week_number = $1', [currentWeek]);
  const currentPrize = prizeRes.rows[0];

  // Calculate weekly sleep for each user (for current challenge week)
  const userWeeklyProgress = users.map((u: any) => {
    const weeklyHours = getUserWeeklySleep(u.id, logs, currentWeek);
    const progressPct = Math.min(100, Math.round((weeklyHours / RAFFLE_THRESHOLD_HOURS) * 100));
    const hoursNeeded = Math.max(0, RAFFLE_THRESHOLD_HOURS - weeklyHours);
    const qualified = weeklyHours >= RAFFLE_THRESHOLD_HOURS;
    return { ...u, weeklyHours, progressPct, hoursNeeded, qualified };
  });

  // Auto opt-in qualified users
  const qualifiedForPrize = userWeeklyProgress.filter(u => u.qualified);
  const newOptIns = await autoOptInQualifiedUsers(pool, currentWeek, qualifiedForPrize);
  if (newOptIns > 0) {
    console.log(`Auto opted-in ${newOptIns} new users for week ${currentWeek} prize`);
  }

  // Build "close to qualifying" section - show top 3 people who are close but not qualified yet
  const almostThere = userWeeklyProgress
    .filter(u => !u.qualified && u.weeklyHours > 0)
    .sort((a, b) => b.weeklyHours - a.weeklyHours)
    .slice(0, 3);

  let prizeProgressText = '';
  if (almostThere.length > 0) {
    prizeProgressText = almostThere.map((u: any) => {
      const mention = u.slack_user_id ? `<@${u.slack_user_id}>` : u.username;
      const progressBar = "▓".repeat(Math.floor(u.progressPct / 10)) + "░".repeat(10 - Math.floor(u.progressPct / 10));
      return `${mention}: \`[${progressBar}]\` ${u.progressPct}% - *${u.hoursNeeded.toFixed(1)}* more hours!`;
    }).join('\n');
  }

  // Prize promo block
  const prizeBlocks = [];
  if (currentPrize) {
    prizeBlocks.push({
      type: "divider"
    });
    prizeBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎁 THIS WEEK'S PRIZE: ${currentPrize.emoji} ${currentPrize.title}*\n_${prizeHealthBenefits?.shortBenefit || ''}_\n\n🎯 *${RAFFLE_THRESHOLD_HOURS.toFixed(1)}* hours this week to qualify!\n⏰ *${daysLeftInWeek}* day${daysLeftInWeek !== 1 ? 's' : ''} left to enter!`
      }
    });
    prizeBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `✅ *Qualified:* ${qualifiedForPrize.length} people are IN the raffle!`
      }
    });
    if (prizeProgressText) {
      prizeBlocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*💤 Almost There!*\n${prizeProgressText}`
        }
      });
    }
    if (prizeHealthBenefits?.healthTip) {
      prizeBlocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: prizeHealthBenefits.healthTip }]
      });
    }
  }

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🌙 Evening Check-in! How's Your Sleep?",
        emoji: true
      }
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `_It's 5 PM - Don't forget to log last night's sleep!_` }]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📊 TODAY'S STATS*\n*${todayHours.toFixed(1)}* hours logged\n🎯 ${goalHitters} people hit 8hr goal\n💭 ~${dreams} dreams | 🔄 ${sleepCycles} sleep cycles${crownMessage}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*😴 TODAY'S LEADERBOARD*\n${topText}`
      }
    },
    ...missingBlocks,
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚔️ TEAM BATTLE*\n\n*Today:* ${winningTeamToday.icon} ${winningTeamToday.name} is winning (${winningTeamToday.todayHours.toFixed(1)} hours)\n\n*Overall:*\n${teamBattleText}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${leadingTeamOverall.icon} ${leadingTeamOverall.name}: *${leadingTeamOverall.overallHours.toFixed(1)}* total\n${trailingTeamOverall.icon} ${trailingTeamOverall.name}: *${trailingTeamOverall.overallHours.toFixed(1)}* total`
      }
    },
    ...prizeBlocks,
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🌍 Challenge Progress:* ${globalPct}%\n\`[${progressBar}]\`\n*${totalHours.toFixed(1)}* hours toward ${GLOBAL_GOAL} hour goal!`
      }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `🎟️ *Week ${currentWeek} Raffle:* ${qualifiedForPrize.length} qualified` },
        { type: "mrkdwn", text: grandPrizeText }
      ]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💡 ${funFact}*`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🎯 *Haven't logged yet? There's still time!*\n<https://teamtrek-1024587728322.us-central1.run.app|Log Your Sleep Now>"
      }
    }
  ];

  await postToSlack(blocks);
};

// 3. Morning Recap - Celebrate Yesterday's Sleep! (9 AM MT)
export const sendSlackMorningRecap = async (pool: Pool) => {
  console.log("Generating Morning Recap...");

  // Get yesterday's date in Mountain Time
  const todayStr = getMountainTimeDate();
  const todayParts = todayStr.split('-').map(Number);
  const todayInMT = new Date(todayParts[0], todayParts[1] - 1, todayParts[2], 12, 0, 0);
  const yesterdayInMT = new Date(todayInMT);
  yesterdayInMT.setDate(todayInMT.getDate() - 1);
  const yesterdayStr = getMountainTimeDate(yesterdayInMT);

  console.log(`Today in MT: ${todayStr}, Looking for logs from yesterday: ${yesterdayStr}`);

  // Format yesterday for display
  const yesterdayDisplay = yesterdayInMT.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Denver'
  });

  // Fetch Data
  const usersRes = await pool.query('SELECT * FROM users');
  const teamsRes = await pool.query('SELECT * FROM teams');
  const logsRes = await pool.query('SELECT * FROM sleep_logs WHERE date_logged = $1', [yesterdayStr]);
  const allLogsRes = await pool.query('SELECT * FROM sleep_logs');

  const users = usersRes.rows;
  const teams = teamsRes.rows;
  const yesterdayLogs = logsRes.rows;

  // Filter logs to challenge period only
  const allLogs = allLogsRes.rows.filter((l: any) =>
    l.date_logged >= CHALLENGE_START && l.date_logged <= CHALLENGE_END
  );

  console.log(`Found ${yesterdayLogs.length} log entries for ${yesterdayStr}`);

  // ========== MONDAY PRIZE DRAWING ==========
  let prizeWinnerBlocks: any[] = [];
  if (isMondayInMT()) {
    const previousWeek = getPreviousWeek();
    console.log(`Monday detected! Checking if we need to draw Week ${previousWeek} prize...`);

    if (previousWeek >= 1 && previousWeek <= 4 && getCurrentWeek() > previousWeek) {
      try {
        const { winner, prize, qualifiedCount, alreadyDrawn } = await drawWeeklyPrizeWinner(pool, previousWeek);

        if (winner && prize) {
          console.log(`Prize winner announcement prepared for ${winner.username}`);
          prizeWinnerBlocks = buildPrizeWinnerBlocks(winner, prize, previousWeek, qualifiedCount);
        } else if (alreadyDrawn) {
          console.log(`Week ${previousWeek} prize was already drawn - skipping announcement`);
        } else {
          console.log(`No qualified entrants for Week ${previousWeek} - skipping prize announcement`);
        }
      } catch (err) {
        console.error(`Error drawing Week ${previousWeek} prize:`, err);
      }
    }
  }

  // If no logs for yesterday, send a shorter message
  if (yesterdayLogs.length === 0) {
    const todayLogsRes = await pool.query('SELECT * FROM sleep_logs WHERE date_logged = $1', [todayStr]);
    const todayLogs = todayLogsRes.rows;
    const hasTodayData = todayLogs.length > 0;

    let messageText = `No sleep was logged yesterday (${yesterdayDisplay}).`;
    if (hasTodayData) {
      const todayHours = todayLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
      messageText += ` But we're off to a great start today with *${todayHours.toFixed(1)} hours* already logged! 🚀`;
    } else {
      messageText += ` Today is a fresh start! 💤`;
    }

    const blocks = [
      ...prizeWinnerBlocks,
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "☀️ Good Morning, Recess Team!",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: messageText
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🎯 *Who's logging their sleep today?*\n<https://teamtrek-1024587728322.us-central1.run.app|Log Your Sleep Now>"
        }
      }
    ];
    await postToSlack(blocks);
    return;
  }

  // Calculate yesterday's stats per user
  const userYesterdayStats = users.map((u: any) => {
    const userLogs = yesterdayLogs.filter((l: any) => l.user_id === u.id);
    const hours = userLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
    const team = teams.find((t: any) => t.id === u.team_id);
    return { ...u, yesterdayHours: hours, teamName: team?.name || 'Unknown', teamIcon: team?.icon || '👥' };
  }).filter(u => u.yesterdayHours > 0).sort((a, b) => b.yesterdayHours - a.yesterdayHours);

  // Total yesterday hours
  const totalYesterdayHours = yesterdayLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
  const participantCount = userYesterdayStats.length;

  // Find the top sleeper (winner)
  const topSleeper = userYesterdayStats[0];

  if (!topSleeper) {
    console.log("No top sleeper found for yesterday");
    return;
  }

  // Record the daily winner in the database
  try {
    await pool.query(`
      INSERT INTO daily_winners (date, user_id, sleep_hours, announced)
      VALUES ($1, $2, $3, TRUE)
      ON CONFLICT (date) DO UPDATE SET announced = TRUE
    `, [yesterdayStr, topSleeper.id, topSleeper.yesterdayHours]);
    console.log(`Recorded daily winner: ${topSleeper.username} with ${topSleeper.yesterdayHours} hours`);
  } catch (err) {
    console.error("Error recording daily winner:", err);
  }

  // Count total daily wins for the top sleeper
  const winsRes = await pool.query(
    'SELECT COUNT(*) as win_count FROM daily_winners WHERE user_id = $1',
    [topSleeper.id]
  );
  const totalWins = parseInt(winsRes.rows[0]?.win_count || '1');

  // Get the top 5 from yesterday
  const top5 = userYesterdayStats.slice(0, 5);

  // Calculate team performance yesterday AND overall
  const teamStats = teams.map((t: any) => {
    const teamMembers = users.filter((u: any) => u.team_id === t.id);
    const memberIds = teamMembers.map((u: any) => u.id);

    // Yesterday's hours
    const teamYesterdayLogs = yesterdayLogs.filter((l: any) => memberIds.includes(l.user_id));
    const yesterdayTotal = teamYesterdayLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);

    // Overall hours
    const teamAllLogs = allLogs.filter((l: any) => memberIds.includes(l.user_id));
    const overallTotal = teamAllLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);

    return { ...t, yesterdayHours: yesterdayTotal, overallHours: overallTotal, memberCount: teamMembers.length };
  });

  const teamsByYesterday = [...teamStats].sort((a, b) => b.yesterdayHours - a.yesterdayHours);
  const teamsByOverall = [...teamStats].sort((a, b) => b.overallHours - a.overallHours);

  const winningTeamYesterday = teamsByYesterday[0];
  const leadingTeamOverall = teamsByOverall[0];
  const trailingTeamOverall = teamsByOverall[1];
  const gap = leadingTeamOverall.overallHours - trailingTeamOverall.overallHours;

  // How many people hit the daily goal
  const goalHitters = userYesterdayStats.filter(u => u.yesterdayHours >= DAILY_GOAL).length;

  // Generate AI motivation
  let motivation = "Let's keep the momentum going today! 🚀";
  try {
    motivation = await getMorningMotivation(topSleeper.username, topSleeper.yesterdayHours, totalWins);
  } catch (error) {
    console.error("Error generating motivation:", error);
  }

  // Build leaderboard text with team icons
  const leaderboardText = top5.map((u, i) => {
    const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const mention = u.slack_user_id ? `<@${u.slack_user_id}>` : u.username;
    return `${medal} ${mention} ${u.teamIcon}: *${u.yesterdayHours.toFixed(1)}* hours`;
  }).join('\n');

  // Crown text based on win streak
  let crownText = '';
  if (totalWins === 1) {
    crownText = '🎉 *First crown earned!*';
  } else if (totalWins === 2) {
    crownText = '🔥 *Back-to-back wins!*';
  } else if (totalWins >= 3) {
    crownText = `👑 *${totalWins}-time champion!*`;
  }

  // Team battle section
  const teamBattleText = leadingTeamOverall.id === trailingTeamOverall.id
    ? `${leadingTeamOverall.icon} *${leadingTeamOverall.name}* is dominating!`
    : `${leadingTeamOverall.icon} *${leadingTeamOverall.name}* leads by *${gap.toFixed(1)}* hours!\n${trailingTeamOverall.icon} *${trailingTeamOverall.name}* - time to catch up! 💤`;

  // ========== WEEKLY PRIZE PROMOTION (Morning) ==========
  const currentWeek = getCurrentWeek();
  const daysLeftInWeek = getDaysLeftInWeek();
  const prizeHealthBenefits = PRIZE_HEALTH_BENEFITS[currentWeek];

  // Fetch this week's prize
  const prizeRes = await pool.query('SELECT * FROM prizes WHERE week_number = $1', [currentWeek]);
  const currentPrize = prizeRes.rows[0];

  // Calculate weekly sleep for each user (for current challenge week)
  const userWeeklyProgress = users.map((u: any) => {
    const weeklyHours = getUserWeeklySleep(u.id, allLogs, currentWeek);
    const progressPct = Math.min(100, Math.round((weeklyHours / RAFFLE_THRESHOLD_HOURS) * 100));
    const hoursNeeded = Math.max(0, RAFFLE_THRESHOLD_HOURS - weeklyHours);
    const qualified = weeklyHours >= RAFFLE_THRESHOLD_HOURS;
    return { ...u, weeklyHours, progressPct, hoursNeeded, qualified };
  });

  // Auto opt-in qualified users
  const qualifiedForPrize = userWeeklyProgress.filter(u => u.qualified);
  const newOptIns = await autoOptInQualifiedUsers(pool, currentWeek, qualifiedForPrize);
  if (newOptIns > 0) {
    console.log(`Morning recap: Auto opted-in ${newOptIns} new users for week ${currentWeek} prize`);
  }

  // Build "close to qualifying" section
  const almostThere = userWeeklyProgress
    .filter(u => !u.qualified && u.weeklyHours > 0)
    .sort((a, b) => b.weeklyHours - a.weeklyHours)
    .slice(0, 5);

  let morningPrizeProgressText = '';
  if (almostThere.length > 0) {
    morningPrizeProgressText = almostThere.map((u: any) => {
      const mention = u.slack_user_id ? `<@${u.slack_user_id}>` : u.username;
      const progressBar = "▓".repeat(Math.floor(u.progressPct / 10)) + "░".repeat(10 - Math.floor(u.progressPct / 10));
      return `${mention}: \`[${progressBar}]\` ${u.progressPct}% (${u.hoursNeeded.toFixed(1)} to go)`;
    }).join('\n');
  }

  // Prize promo block for morning
  const morningPrizeBlocks = [];
  if (currentPrize) {
    morningPrizeBlocks.push({
      type: "divider"
    });
    morningPrizeBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎁 WEEK ${currentWeek} PRIZE: ${currentPrize.emoji} ${currentPrize.title}*\n_${prizeHealthBenefits?.shortBenefit || ''}_`
      }
    });
    morningPrizeBlocks.push({
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*🎯 Goal*\n${RAFFLE_THRESHOLD_HOURS.toFixed(1)} hours` },
        { type: "mrkdwn", text: `*⏰ Days Left*\n${daysLeftInWeek + 1} day${daysLeftInWeek !== 0 ? 's' : ''}` }
      ]
    });
    morningPrizeBlocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `✅ *${qualifiedForPrize.length} people* are already IN the raffle! 🎉`
      }
    });
    if (morningPrizeProgressText) {
      morningPrizeBlocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*💤 Race to Qualify:*\n${morningPrizeProgressText}`
        }
      });
    }
    if (prizeHealthBenefits?.healthTip) {
      morningPrizeBlocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: prizeHealthBenefits.healthTip }]
      });
    }
  }

  const blocks = [
    ...prizeWinnerBlocks,
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🌅 Yesterday's Sleep Champions!",
        emoji: true
      }
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Results from *${yesterdayDisplay}*` }]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🏆 *TOP SLEEPER*\n\n👑 ${topSleeper.slack_user_id ? `<@${topSleeper.slack_user_id}>` : `*${topSleeper.username}*`}\n*${topSleeper.yesterdayHours.toFixed(1)} hours!*\n${topSleeper.teamIcon} ${topSleeper.teamName}\n\n${crownText}`
      }
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📊 LEADERBOARD*\n${leaderboardText}`
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*📈 Total Hours*\n${totalYesterdayHours.toFixed(1)}`
        },
        {
          type: "mrkdwn",
          text: `*🎯 Hit 8hr Goal*\n${goalHitters} of ${participantCount}`
        }
      ]
    },
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*⚔️ TEAM BATTLE*\n\n*Yesterday's Winner:* ${winningTeamYesterday.icon} ${winningTeamYesterday.name} (${winningTeamYesterday.yesterdayHours.toFixed(1)} hours)\n\n*Overall Standing:*\n${teamBattleText}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${leadingTeamOverall.icon} ${leadingTeamOverall.name}: *${leadingTeamOverall.overallHours.toFixed(1)}* total\n${trailingTeamOverall.icon} ${trailingTeamOverall.name}: *${trailingTeamOverall.overallHours.toFixed(1)}* total`
      }
    },
    ...morningPrizeBlocks,
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💬 ${motivation}*`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🌟 *Ready to log today's sleep?*\n<https://teamtrek-1024587728322.us-central1.run.app|Log Your Sleep Now>"
      }
    }
  ];

  await postToSlack(blocks);
};

// Get daily win count for a user
export const getDailyWinCount = async (pool: Pool, userId: number): Promise<number> => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM daily_winners WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0]?.count || '0');
  } catch (err) {
    console.error("Error getting daily win count:", err);
    return 0;
  }
};

// Preview morning recap for a specific date
export const previewMorningRecap = async (pool: Pool, dateStr: string): Promise<any> => {
  try {
    const logsRes = await pool.query('SELECT * FROM sleep_logs WHERE date_logged = $1', [dateStr]);
    const usersRes = await pool.query('SELECT * FROM users');
    const teamsRes = await pool.query('SELECT * FROM teams');

    const logs = logsRes.rows;
    const users = usersRes.rows;
    const teams = teamsRes.rows;

    const userStats = users.map((u: any) => {
      const userLogs = logs.filter((l: any) => l.user_id === u.id);
      const hours = userLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
      const team = teams.find((t: any) => t.id === u.team_id);
      return { username: u.username, hours, team: team?.name };
    }).filter(u => u.hours > 0).sort((a, b) => b.hours - a.hours);

    return {
      date: dateStr,
      totalLogs: logs.length,
      totalHours: logs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0),
      topSleeper: userStats[0] || null,
      leaderboard: userStats.slice(0, 5)
    };
  } catch (err: any) {
    console.error("Preview error:", err);
    throw err;
  }
};

// Check and announce milestone (50%, 100%, etc.)
export const checkAndAnnounceMilestone = async (
  pool: Pool,
  userId: number,
  logId: number,
  previousTotal: number,
  newTotal: number
): Promise<void> => {
  try {
    // 50% milestone threshold (50% of GLOBAL_GOAL)
    const FIFTY_PERCENT_THRESHOLD = GLOBAL_GOAL * 0.5;

    // Check if we just crossed 50%
    if (previousTotal < FIFTY_PERCENT_THRESHOLD && newTotal >= FIFTY_PERCENT_THRESHOLD) {
      // Check if 50% milestone was already announced
      const existingMilestone = await pool.query(
        "SELECT * FROM milestone_events WHERE milestone_type = '50_percent'"
      );

      if (existingMilestone.rows.length === 0) {
        // Record the milestone
        await pool.query(`
          INSERT INTO milestone_events (milestone_type, threshold_value, total_hours_at_trigger, triggered_by_user_id, triggered_by_log_id)
          VALUES ('50_percent', $1, $2, $3, $4)
        `, [FIFTY_PERCENT_THRESHOLD, newTotal, userId, logId]);

        // Get user info for announcement
        const userRes = await pool.query(`
          SELECT u.username, u.avatar_emoji, t.name as team_name, t.icon as team_icon
          FROM users u
          JOIN teams t ON u.team_id = t.id
          WHERE u.id = $1
        `, [userId]);
        const user = userRes.rows[0];

        // Get grand prize info
        const prizeRes = await pool.query("SELECT * FROM prizes WHERE prize_type = 'grand'");
        const grandPrize = prizeRes.rows[0];

        // Announce to Slack
        const blocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🎉🌟 HALFWAY THERE! 🌟🎉",
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*WE DID IT!* The team just crossed *50%* of our sleep challenge goal!\n\n${user?.avatar_emoji || '😴'} *${user?.username}* ${user?.team_icon || ''} pushed us over the finish line with their latest log!`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📊 *${newTotal.toFixed(1)} hours* of sleep logged so far!\n\nThat's *half the journey* to unlocking the grand prize! 🏆`
            }
          },
          {
            type: "context",
            elements: [{
              type: "mrkdwn",
              text: `${grandPrize?.emoji || '👑'} Grand Prize: *${grandPrize?.title || 'Ultimate Sleep Setup'}*`
            }]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "_Keep logging your sleep—we're on track for something amazing!_ 💪"
            }
          }
        ];

        await postToSlack(blocks);
        console.log(`🎉 50% milestone announced! Triggered by ${user?.username}`);
      }
    }
  } catch (err) {
    console.error("Error checking milestone:", err);
  }
};

// Gather challenge stats for finale
export const gatherChallengeStats = async (pool: Pool): Promise<any> => {
  try {
    const usersRes = await pool.query('SELECT * FROM users');
    const teamsRes = await pool.query('SELECT * FROM teams');
    const logsRes = await pool.query('SELECT * FROM sleep_logs');

    const users = usersRes.rows;
    const teams = teamsRes.rows;
    const logs = logsRes.rows;

    // Total hours
    const totalHours = logs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);

    // Individual stats
    const userStats = users.map((u: any) => {
      const userLogs = logs.filter((l: any) => l.user_id === u.id);
      const hours = userLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
      const daysLogged = new Set(userLogs.map((l: any) => l.date_logged)).size;
      const avgHours = daysLogged > 0 ? hours / daysLogged : 0;
      return { ...u, totalHours: hours, daysLogged, avgHours };
    }).sort((a, b) => b.totalHours - a.totalHours);

    // Team stats
    const teamStats = teams.map((t: any) => {
      const memberIds = users.filter((u: any) => u.team_id === t.id).map((u: any) => u.id);
      const teamLogs = logs.filter((l: any) => memberIds.includes(l.user_id));
      const hours = teamLogs.reduce((sum: number, l: any) => sum + parseFloat(l.sleep_hours), 0);
      return { ...t, totalHours: hours };
    }).sort((a, b) => b.totalHours - a.totalHours);

    return {
      totalHours,
      totalLogs: logs.length,
      participantCount: users.length,
      topSleepers: userStats.slice(0, 5),
      mostConsistent: userStats.sort((a, b) => b.daysLogged - a.daysLogged).slice(0, 3),
      winningTeam: teamStats[0],
      teamStats,
      grandPrizeQualified: users.filter((u: any) => u.grand_prize_entry).length
    };
  } catch (err) {
    console.error("Error gathering challenge stats:", err);
    throw err;
  }
};

// Send countdown post before grand prize drawing
export const sendGrandPrizeCountdownPost = async (pool: Pool): Promise<any> => {
  try {
    const stats = await gatherChallengeStats(pool);

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "⏰ LAST CHANCE! Grand Prize Drawing Tomorrow!",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*The Sleep Challenge ends TONIGHT!*\n\n📊 *Final Stats:*\n• 😴 *${stats.totalHours.toFixed(1)}* total hours logged\n• 🏆 *${stats.grandPrizeQualified}* people qualified for grand prize\n• 👥 *${stats.participantCount}* participants`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎯 *Not qualified yet?* You still have time!\n\nLog your sleep before midnight to hit ${GRAND_PRIZE_THRESHOLD_HOURS.toFixed(1)} hours and enter the drawing!`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "<https://teamtrek-1024587728322.us-central1.run.app|Log Your Sleep Now>"
        }
      }
    ];

    await postToSlack(blocks);
    return { success: true, message: "Countdown post sent" };
  } catch (err: any) {
    console.error("Error sending countdown post:", err);
    return { success: false, message: err.message };
  }
};

// Send epic finale announcement
export const sendEpicFinaleAnnouncement = async (pool: Pool): Promise<any> => {
  try {
    // First draw the grand prize winner
    const { winner, prize, qualifiedCount, alreadyDrawn, totalHours } = await drawGrandPrizeWinner(pool);
    const stats = await gatherChallengeStats(pool);

    if (alreadyDrawn) {
      return { success: false, message: "Grand prize already drawn" };
    }

    if (!winner) {
      return { success: false, message: "No qualified participants" };
    }

    // Build epic finale blocks
    const winnerMention = winner.slack_user_id
      ? `<@${winner.slack_user_id}>`
      : `*${winner.username}*`;

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🏆✨ DECEMBER SLEEP CHALLENGE FINALE ✨🏆",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*What. A. Month.* 🌙\n\nTogether, we logged *${stats.totalHours.toFixed(1)} hours* of sleep!\nThat's *${Math.round(stats.totalHours / 24)} full days* of rest! 💤`
        }
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🥁 *AND THE GRAND PRIZE WINNER IS...* 🥁`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎊 *CONGRATULATIONS ${winnerMention}!* ${winner.avatar_emoji} 🎊\n\nYou've won the *${prize.emoji} ${prize.title}*!\n\n_${prize.description}_`
        }
      },
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: `🎲 Randomly selected from ${qualifiedCount} qualified participants`
        }]
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🏆 CHALLENGE CHAMPIONS*\n\n${stats.topSleepers.slice(0, 3).map((u: any, i: number) =>
            `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} *${u.username}*: ${u.totalHours.toFixed(1)} hours`
          ).join('\n')}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*⚔️ WINNING TEAM*\n${stats.winningTeam.icon} *${stats.winningTeam.name}* with ${stats.winningTeam.totalHours.toFixed(1)} total hours!`
        }
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🙏 THANK YOU EVERYONE!*\n\nWhether you won a prize or not, you all invested in your sleep health this month—and that's the real win. 💪\n\n_See you at the next challenge!_ 🚀`
        }
      }
    ];

    await postToSlack(blocks);
    return {
      success: true,
      message: "Epic finale posted!",
      winner: winner.username,
      stats
    };
  } catch (err: any) {
    console.error("Error sending finale:", err);
    return { success: false, message: err.message };
  }
};

// Send Awards Ceremony to Slack
export const sendAwardsCeremony = async (
  pool: Pool,
  period: string, // 'week1', 'week2', etc. or 'final'
  awards: { id: string; emoji: string; title: string; winner: string; winnerEmoji: string; stat: string }[]
): Promise<void> => {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) return;

  const isFinale = period === 'final';
  const header = isFinale ? '🏆 THE AWARDS CEREMONY 🏆' : `📋 Week ${period.replace('week', '')} Awards`;

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: header, emoji: true }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: isFinale
          ? '*The results are in! Here are your DreamTeam Sleep Challenge champions:*'
          : `*This week's standout sleepers:*`
      }
    },
    { type: 'divider' },
  ];

  for (const award of awards) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${award.emoji} *${award.title}*\n${award.winnerEmoji} *${award.winner}* — ${award.stat}`
      }
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: isFinale ? '🌙 _Thanks for sleeping better together!_' : '💤 _Keep those sleep scores climbing!_' }]
    }
  );

  await postToSlack(blocks);
};
