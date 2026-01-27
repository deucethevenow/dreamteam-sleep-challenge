# 🌙 DreamTeam - Sleep Challenge

A gamified team sleep challenge platform that boosts wellbeing, builds culture, and gets your team resting better!

**Transformed from [TeamTrek](https://github.com/deucethevenow/teamtrek) step challenge to sleep tracking.**

![Sleep Challenge](https://img.shields.io/badge/Sleep-Challenge-purple) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)

## ✨ Features

### 📝 Sleep Logging
- **Bedtime & Wake Time** - Auto-calculates sleep hours
- **Quality Rating** - 1-5 star rating
- **Screenshot Upload** - Verify with wearable screenshots
- **Notes** - Track how you slept

### 📊 Advanced Sleep Metrics (from wearables)
- **Sleep Score** (0-100) - Composite health metric
- **Deep Sleep** - Physical recovery (ideal: 60-120 min)
- **REM Sleep** - Mental recovery, dreams (ideal: 90-120 min)
- **Light Sleep** - Transition sleep stages
- **Awake Time** - Time spent awake during the night

### 🎮 Gamification
- **Teams**: Night Owls 🦉 vs Dream Chasers ✨
- **Weekly Prizes** - Hit 60% of 56h weekly goal
- **Grand Prize** - Hit 70% of 248h monthly goal
- **Badges** - Sleep Champion, Early Riser, Power Sleeper, etc.
- **Sleep Aura** - Visual status based on sleep quality

### 💤 Sleep Bonuses
- No Caffeine After 2pm (+1h)
- Wind-Down Routine (+0.5h)
- No Screens Before Bed (+0.5h)
- Cool Bedroom 65-68°F (+0.5h)
- Bedtime Meditation (+0.5h)
- Consistent Schedule (+0.5h)
- Power Nap (+0.5h)

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev

# Start backend server (separate terminal)
npm run server
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dreamteam
VITE_GEMINI_API_KEY=your-gemini-api-key  # For AI sleep tips
SLACK_WEBHOOK_URL=your-slack-webhook     # For Slack integration
```

### Build for Production

```bash
npm run build
```

## 🌐 Deployment

### Option 1: Railway (Recommended)

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Add a PostgreSQL database
3. Set environment variables
4. Deploy!

### Option 2: Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect to your GitHub repo
3. Add a PostgreSQL database
4. Set build command: `npm install && npm run build`
5. Set start command: `npm run start`

### Option 3: Vercel + External DB

1. Deploy frontend to Vercel
2. Use separate backend hosting (Railway, Render, etc.)
3. Update API URL in frontend

## 📱 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend**: Express, PostgreSQL
- **AI**: Google Gemini (for sleep tips)
- **Integrations**: Slack

## 📈 Goals

| Metric | Daily | Weekly | Monthly |
|--------|-------|--------|---------|
| Goal | 8h | 56h | 248h |
| Weekly Prize | - | 33.6h (60%) | - |
| Grand Prize | - | - | 173.6h (70%) |

## 🏆 Milestones

1. **Recess HQ (Awake)** - 0h
2. **Dreamland Gateway** - 500h
3. **REM Rapids** - 1000h
4. **Deep Sleep Valley** - 1500h
5. **Circadian Summit** - 2000h
6. **Sleep Nirvana** 🏆 - 2480h

## 📄 License

MIT

---

Built with 💤 for Recess Digital's January 2026 Sleep Challenge
