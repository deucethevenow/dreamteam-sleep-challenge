# Changelog

## v1.0.0 - DreamTeam Sleep Challenge (2026-01-27)

Complete transformation from TeamTrek step challenge to DreamTeam sleep challenge.

### 🌙 Core Changes

**Steps → Sleep Hours**
- All tracking now based on sleep hours instead of steps
- Daily goal: 8 hours of sleep
- Weekly goal: 56 hours (60% threshold for weekly prize: 33.6h)
- Monthly goal: 248 hours (70% threshold for grand prize: 173.6h)

### 📝 New Sleep Logging Features

**Basic Sleep Entry:**
- Bedtime and wake time inputs
- Auto-calculated sleep duration
- Sleep quality rating (1-5 stars)
- Screenshot upload support (for wearable app verification)
- Notes field

**Advanced Sleep Metrics (Optional):**
From wearables like Oura, Apple Watch, Fitbit, Whoop:
- Sleep Score (0-100)
- Deep Sleep (minutes) - ideal: 60-120 min, 15-25% of sleep
- REM Sleep (minutes) - ideal: 90-120 min, 20-25% of sleep
- Light Sleep (minutes) - typically 50-60% of sleep
- Awake time (minutes) - ideal: <30 min

### 🎮 Updated Gamification

**Sleep-Themed Bonuses:**
- No Caffeine After 2pm (+1h)
- Wind-Down Routine (+0.5h)
- No Screens Before Bed (+0.5h)
- Cool Bedroom 65-68°F (+0.5h)
- Bedtime Meditation (+0.5h)
- Consistent Schedule (+0.5h)
- Power Nap (+0.5h)

**Sleep-Themed Badges:**
- Sleep Champion (3-day streak)
- Early Riser (woke before 7am)
- Consistent Sleeper (same bedtime ±30 min)
- Weekend Warrior (hit goal on weekend)
- Power Sleeper (9+ hours)
- Dreamland MVP (most sleep in a day)

**Sleep-Themed Milestones:**
- Recess HQ (Awake) → 0h
- Dreamland Gateway → 500h
- REM Rapids → 1000h
- Deep Sleep Valley → 1500h
- Circadian Summit → 2000h
- Sleep Nirvana 🏆 → 2480h

**Sleep-Themed Teams:**
- The Night Owls 🦉
- The Dream Chasers ✨

### 🎨 UI/UX Updates

- Purple/indigo color scheme (nighttime theme)
- Moon icons throughout
- "Sleep Aura" status based on hours + quality
- Starfield effect on login screen
- Sleep-focused daily quests
- AI-powered sleep tips (via Gemini)

### 🔧 Technical Changes

**Types (types.ts):**
- New `SleepLog` interface with bedtime, wake_time, sleep_hours, quality_rating, screenshot_url, notes, metrics
- New `SleepMetrics` interface for wearable data
- New `BonusActivity` interface

**Constants (constants.ts):**
- All step-based calculations converted to hours
- New sleep-specific helper functions
- Updated fun insights for sleep context

**Data Service (dataService.ts):**
- `logSleep()` with metrics parameter
- `logBonus()` for sleep wellness activities
- All step-based methods converted to hours

### 📱 Components Updated

- Dashboard - Full sleep logging modal with advanced metrics
- MyEntries - Sleep log history with bedtime/wake time display
- Leaderboard - Hours instead of steps
- JourneyMap - Sleep-themed journey progress
- Login - Nighttime theme with stars
- App - Updated branding

---

Built with 💤 for Recess Digital's January 2026 Sleep Challenge
