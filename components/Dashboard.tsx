import React, { useState, useEffect } from 'react';
import { User, Badge, SleepMetrics } from '../types';
import { db } from '../services/dataService';
import { getSleepTip, analyzeSleepScreenshots, ExtractedSleepData } from '../services/geminiService';
import { DAILY_GOAL, RAFFLE_THRESHOLD_HOURS, GRAND_PRIZE_THRESHOLD_HOURS, calculateMetrics, getFunInsight, getDetailedImpact, getTodaysQuest, getSleepAura, calculateSleepHours, calculateCompositeScore, calculateConsistencyVariation } from '../constants';
import { Moon, Star, Brain, Ticket, Medal, CalendarClock, CheckCircle2, Crown, Users, Clock, Zap, Bell, WifiOff, RefreshCw, Calendar, Bed, Sun, ChevronDown, ChevronUp, Activity, Upload, Sparkles, AlertCircle, CheckCircle, Edit3, Loader2, Camera } from 'lucide-react';
import PrizeTracker from './PrizeTracker';
import MilestoneCelebration from './MilestoneCelebration';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [todayHours, setTodayHours] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [totalMonthHours, setTotalMonthHours] = useState(0);
  const [tip, setTip] = useState('Loading sleep wisdom...');
  const [showLogModal, setShowLogModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Logging State
  const [bedtime, setBedtime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [qualityRating, setQualityRating] = useState<number>(0);
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' }));
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  
  // AI Screenshot Analysis State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showReviewCard, setShowReviewCard] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedSleepData | null>(null);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  
  // Advanced Sleep Metrics State
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [sleepScore, setSleepScore] = useState<string>('');
  const [deepSleepMin, setDeepSleepMin] = useState<string>('');
  const [remSleepMin, setRemSleepMin] = useState<string>('');
  const [lightSleepMin, setLightSleepMin] = useState<string>('');
  const [awakeMin, setAwakeMin] = useState<string>('');
  const [sleepEfficiency, setSleepEfficiency] = useState<string>('');
  const [sleepLatency, setSleepLatency] = useState<string>('');
  
  // Composite Score State
  const [compositeScore, setCompositeScore] = useState(0);
  const [consistencyVar, setConsistencyVar] = useState(0);

  // Gamification State
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [questCompleted, setQuestCompleted] = useState(false);
  
  // Raffle State
  const [hasEnteredWeekly, setHasEnteredWeekly] = useState(false);
  const [hasEnteredGrand, setHasEnteredGrand] = useState(false);
  const [weeklyParticipants, setWeeklyParticipants] = useState<User[]>([]);
  const [grandParticipants, setGrandParticipants] = useState<User[]>([]);
  const [daysLeft, setDaysLeft] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);

  // Milestone Celebration State
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [milestoneData, setMilestoneData] = useState<{
    grandPrize: { emoji: string; title: string; description: string } | null;
    totalHours: number;
    triggeredBy?: { username: string; avatar_emoji: string };
  } | null>(null);

  const todaysQuest = getTodaysQuest();
  const sleepAura = getSleepAura(todayHours, qualityRating || undefined);

  const fetchData = async () => {
    const tHours = await db.getTodayHours(user.id);
    const wHours = await db.getWeeklyHours(user.id);
    const mHours = await db.getTotalMonthHours(user.id);
    
    setTodayHours(tHours);
    setWeeklyHours(wHours);
    setTotalMonthHours(mHours);
    setIsOnline(db.getIsOnline());
    
    if (tHours >= (todaysQuest.targetValue || 8)) {
        setQuestCompleted(true);
    }

    const userStats = await db.getUserStats();
    const myStats = userStats.find(u => u.user.id === user.id);
    
    if (myStats) {
      setStreak(myStats.streak);
      setBadges(myStats.badges);
      setHasEnteredWeekly(myStats.user.raffle_tickets > 0);
      setHasEnteredGrand(myStats.user.grand_prize_entry);
    }
    
    const wParts = await db.getRaffleParticipants();
    const gParts = await db.getGrandPrizeParticipants();
    setWeeklyParticipants(wParts);
    setGrandParticipants(gParts);

    setDaysLeft(db.getDaysLeftInMonth());
    setCurrentDay(db.getCurrentDayOfMonth());

    const dayOfMonth = db.getCurrentDayOfMonth();
    const week = Math.ceil(dayOfMonth / 7);
    setCurrentWeek(Math.min(week, 4));

    try {
      const prizesRes = await fetch('/api/prizes');
      if (prizesRes.ok) {
        const prizesData = await prizesRes.json();
        setPrizes(prizesData);
      }
    } catch (err) {
      console.error('Failed to fetch prizes:', err);
    }

    // Compute composite sleep score from user's recent logs
    try {
      const userLogs = await db.getUserLogs(user.id);
      const recentLogs = userLogs.slice(0, 7);
      const consistency = calculateConsistencyVariation(recentLogs);
      setConsistencyVar(consistency.avgVariation);

      const sleepOnlyLogs = recentLogs.filter(l => !l.bonus_type);
      const avgHours = sleepOnlyLogs.length > 0
        ? sleepOnlyLogs.reduce((sum, l) => sum + l.sleep_hours, 0) / sleepOnlyLogs.length
        : 0;
      const score = calculateCompositeScore(avgHours, consistency.avgVariation);
      setCompositeScore(score.total);
    } catch (err) {
      console.error('Failed to compute composite score:', err);
    }

    if (tip === 'Loading sleep wisdom...') {
        const newTip = await getSleepTip(tHours);
        setTip(newTip);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  useEffect(() => {
    const checkMilestoneCelebration = async () => {
      try {
        const res = await fetch('/api/milestones/50-percent');
        if (!res.ok) return;

        const data = await res.json();

        if (data.achieved && data.grandPrize) {
          const seenKey = `dt_milestone_50_seen_${user.id}`;
          const hasSeenCelebration = localStorage.getItem(seenKey);

          if (!hasSeenCelebration) {
            setMilestoneData({
              grandPrize: data.grandPrize,
              totalHours: data.totalHoursAtTrigger,
              triggeredBy: data.triggeredBy
            });
            setShowMilestoneCelebration(true);
          }
        }
      } catch (err) {
        console.error('Failed to check milestone status:', err);
      }
    };

    checkMilestoneCelebration();
  }, [user.id]);

  const handleMilestoneClose = () => {
    const seenKey = `dt_milestone_50_seen_${user.id}`;
    localStorage.setItem(seenKey, 'true');
    setShowMilestoneCelebration(false);
  };

  // Calculate sleep hours when times change
  // If AI extracted actual sleep duration, use that instead of bedtime-to-wake calculation
  useEffect(() => {
    if (bedtime && wakeTime) {
      if (extractedData?.totalSleepHours) {
        setCalculatedHours(extractedData.totalSleepHours);
      } else {
        const hours = calculateSleepHours(bedtime, wakeTime);
        setCalculatedHours(hours);
      }
    }
  }, [bedtime, wakeTime, extractedData]);

  // Handle AI Screenshot Analysis
  const handleScanScreenshots = async () => {
    if (screenshotFiles.length === 0) return;
    
    setIsScanning(true);
    setScanError(null);
    setScanWarnings([]);
    
    try {
      const result = await analyzeSleepScreenshots(screenshotFiles);
      
      if (result.success && result.data) {
        setExtractedData(result.data);
        setShowReviewCard(true);
        
        // Pre-fill form fields with extracted data
        if (result.data.bedtime) {
          setBedtime(result.data.bedtime);
        }
        if (result.data.wakeTime) {
          setWakeTime(result.data.wakeTime);
        }
        if (result.data.sleepScore) {
          setSleepScore(result.data.sleepScore.toString());
        }
        if (result.data.deepSleepMin) {
          setDeepSleepMin(result.data.deepSleepMin.toString());
        }
        if (result.data.remSleepMin) {
          setRemSleepMin(result.data.remSleepMin.toString());
        }
        if (result.data.lightSleepMin) {
          setLightSleepMin(result.data.lightSleepMin.toString());
        }
        if (result.data.awakeMin) {
          setAwakeMin(result.data.awakeMin.toString());
        }
        
        // If AI extracted actual sleep duration, use it instead of bedtime-to-wake calculation
        if (result.data.totalSleepHours) {
          setCalculatedHours(result.data.totalSleepHours);
        }

        // Auto-fill efficiency and latency if available
        if (result.data.sleepEfficiency) {
          // Store efficiency for metrics submission (calculated from actual sleep / time in bed)
          setSleepEfficiency(result.data.sleepEfficiency.toString());
        }
        if (result.data.sleepLatencyMin) {
          setSleepLatency(result.data.sleepLatencyMin.toString());
        }

        // Show advanced metrics if we got stage data
        if (result.data.deepSleepMin || result.data.remSleepMin || result.data.sleepScore) {
          setShowAdvancedMetrics(true);
        }
        
        if (result.warnings && result.warnings.length > 0) {
          setScanWarnings(result.warnings);
        }
      } else {
        setScanError(result.errors?.[0] || 'Failed to analyze screenshots');
        setShowReviewCard(false);
      }
    } catch (error) {
      setScanError('An unexpected error occurred. Please try again or enter data manually.');
      console.error('Screenshot analysis error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Apply extracted data and close review
  const handleConfirmExtractedData = () => {
    setShowReviewCard(false);
    // Data is already in the form fields, user can now submit
  };

  // Discard extracted data and reset
  const handleDiscardExtractedData = () => {
    setShowReviewCard(false);
    setExtractedData(null);
    setScanWarnings([]);
  };

  const handleLogSubmit = async () => {
    if (isSubmitting || calculatedHours === 0) return;
    setIsSubmitting(true);
    
    try {
        let screenshotUrl: string | undefined;
        
        // Use first screenshot file if available
        if (screenshotFiles.length > 0) {
          const reader = new FileReader();
          screenshotUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(screenshotFiles[0]);
          });
        }

        // Build metrics object if any advanced metrics provided
        const metrics: SleepMetrics | undefined = (sleepScore || deepSleepMin || remSleepMin || lightSleepMin || awakeMin || sleepEfficiency || sleepLatency) ? {
          sleep_score: sleepScore ? parseInt(sleepScore) : undefined,
          deep_sleep_min: deepSleepMin ? parseInt(deepSleepMin) : undefined,
          rem_sleep_min: remSleepMin ? parseInt(remSleepMin) : undefined,
          light_sleep_min: lightSleepMin ? parseInt(lightSleepMin) : undefined,
          awake_min: awakeMin ? parseInt(awakeMin) : undefined,
          sleep_efficiency: sleepEfficiency ? parseFloat(sleepEfficiency) : undefined,
          sleep_latency_min: sleepLatency ? parseInt(sleepLatency) : undefined,
        } : undefined;

        await db.logSleep(
          user.id,
          bedtime,
          wakeTime,
          qualityRating || undefined,
          screenshotUrl,
          notes || undefined,
          selectedDate,
          metrics,
          extractedData?.totalSleepHours || undefined
        );

        // Reset Form
        setBedtime('22:30');
        setWakeTime('06:30');
        setQualityRating(0);
        setScreenshotFiles([]);
        setNotes('');
        setSleepScore('');
        setDeepSleepMin('');
        setRemSleepMin('');
        setLightSleepMin('');
        setAwakeMin('');
        setSleepEfficiency('');
        setSleepLatency('');
        setShowAdvancedMetrics(false);
        setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' }));
        
        // Reset AI scan state
        setShowReviewCard(false);
        setExtractedData(null);
        setScanError(null);
        setScanWarnings([]);

        setShowLogModal(false);
        await fetchData(); 
    } catch (e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleEnterWeeklyRaffle = async () => {
    if (weeklyHours < RAFFLE_THRESHOLD_HOURS) return;
    const success = await db.enterWeeklyRaffle(user.id);
    if (success) {
      alert("🎟️ You're in! Good luck in this week's draw!");
      fetchData();
    }
  };

  const handleEnterGrandPrize = async () => {
    if (totalMonthHours < GRAND_PRIZE_THRESHOLD_HOURS) return;
    const success = await db.enterGrandPrize(user.id);
    if (success) {
      alert("👑 You're in the Grand Prize Draw! Outstanding rest!");
      fetchData();
    }
  };
  
  const progressPercentage = Math.min(100, (todayHours / DAILY_GOAL) * 100);
  const weeklyPercentage = Math.min(100, (weeklyHours / RAFFLE_THRESHOLD_HOURS) * 100);
  const grandPercentage = Math.min(100, (totalMonthHours / GRAND_PRIZE_THRESHOLD_HOURS) * 100);

  const [companyProgress, setCompanyProgress] = useState(0);

  useEffect(() => {
    const fetchGlobalProgress = async () => {
      const progress = await db.getGlobalProgress();
      setCompanyProgress(progress.percentage);
    };
    fetchGlobalProgress();
  }, [totalMonthHours]);

  const showGrandPrize = companyProgress >= 50;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const todayMetrics = calculateMetrics(todayHours);
  const monthMetrics = calculateMetrics(totalMonthHours);
  const todayImpactDetails = getDetailedImpact(todayHours);
  const monthImpactDetails = getDetailedImpact(totalMonthHours);

  // Quality rating stars
  const renderQualityStars = () => {
    return (
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setQualityRating(star)}
            className={`text-3xl transition-all ${
              star <= qualityRating 
                ? 'text-yellow-400 scale-110' 
                : 'text-gray-300 hover:text-yellow-200'
            }`}
          >
            ⭐
          </button>
        ))}
      </div>
    );
  };

  // Sleep score color
  const getSleepScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
           <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white text-xl mr-3 border-4 relative shadow-lg ${sleepAura.glow}`} >
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${sleepAura.color} opacity-20`}></div>
              <div className={`absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-br ${sleepAura.color} [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]`}></div>
              <span className="relative z-10">{user.avatar_emoji}</span>
              <div className={`absolute -bottom-1 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white bg-gradient-to-r ${sleepAura.color} shadow-sm uppercase tracking-wider`}>
                {sleepAura.label}
              </div>
           </div>
           
           <div>
             <h1 className="text-2xl font-bold text-gray-900">Hi, {user.username}</h1>
             <p className="text-gray-500 text-sm">Jan Challenge: <span className="font-bold text-indigo-600">Day {currentDay}</span></p>
           </div>
        </div>
        <div className="flex flex-col items-end">
            {streak > 0 ? (
                <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1 flex items-center animate-pulse border border-indigo-100">
                    <Moon size={12} className="mr-1 fill-current" />
                    {streak} Night Streak
                </div>
            ) : (
                <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1 flex items-center">
                    <CalendarClock size={12} className="mr-1" />
                    {daysLeft} Nights Left
                </div>
            )}
        </div>
      </div>

      {/* Daily Quest Card */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-4 shadow-lg flex items-center justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-purple-500/20 to-transparent"></div>
        <div className="flex items-center relative z-10">
            <div className="bg-indigo-800 p-3 rounded-xl mr-4 text-2xl border border-indigo-700">
                {todaysQuest.icon}
            </div>
            <div>
                <div className="flex items-center text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
                    <Bell size={12} className="mr-1" /> Tonight's Goal
                </div>
                <h3 className="text-white font-bold text-sm">{todaysQuest.label}</h3>
                <p className="text-indigo-200 text-xs">{todaysQuest.description}</p>
            </div>
        </div>
        <div className="relative z-10">
            {questCompleted ? (
                <div className="bg-yellow-500 text-indigo-900 p-2 rounded-full shadow-lg shadow-yellow-500/20 animate-bounce">
                    <Star size={20} className="fill-current" />
                </div>
            ) : (
                <div className="w-8 h-8 rounded-full border-2 border-indigo-700 border-dashed"></div>
            )}
        </div>
      </div>

      {/* Main Sleep Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Circular Progress */}
            <div className="relative w-48 h-48 mb-6 md:mb-0 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100"/>
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-indigo-500 transition-all duration-1000 ease-out" strokeLinecap="round"/>
              </svg>
              <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-gray-900">{todayHours.toFixed(1)}</span>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-1">/ {DAILY_GOAL}h goal</span>
              </div>
            </div>
            
            {/* Today's Stats Grid */}
            <div className="flex-1 w-full md:ml-8">
                <div className="mb-3 px-1">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Night</h4>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-xl border border-indigo-200">
                        <div className="flex items-center text-indigo-600 text-xs font-bold uppercase mb-1">
                            <Moon size={12} className="mr-1" /> Hours
                        </div>
                        <div className="text-lg font-bold text-gray-900">{todayHours.toFixed(1)} <span className="text-xs font-normal text-gray-600">hrs</span></div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl border border-purple-200">
                        <div className="flex items-center text-purple-600 text-xs font-bold uppercase mb-1">
                            <Clock size={12} className="mr-1" /> Minutes
                        </div>
                        <div className="text-lg font-bold text-gray-900">{todayMetrics.minutes} <span className="text-xs font-normal text-gray-600">min</span></div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200">
                        <div className="flex items-center text-blue-600 text-xs font-bold uppercase mb-1">
                            <Star size={12} className="mr-1" /> Progress
                        </div>
                        <div className="text-lg font-bold text-gray-900">{Math.round(progressPercentage)}<span className="text-xs font-normal text-gray-600">%</span></div>
                    </div>
                </div>

                <div className="mb-2 px-1">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">This Month</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center text-gray-500 text-xs font-bold uppercase mb-1">
                            <Moon size={12} className="mr-1" />
                        </div>
                        <div className="text-sm font-bold text-gray-700">{totalMonthHours.toFixed(1)} <span className="text-xs font-normal text-gray-500">hrs</span></div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center text-gray-500 text-xs font-bold uppercase mb-1">
                            <Sun size={12} className="mr-1" />
                        </div>
                        <div className="text-sm font-bold text-gray-700">{monthMetrics.days} <span className="text-xs font-normal text-gray-500">days</span></div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center text-gray-500 text-xs font-bold uppercase mb-1">
                            <Zap size={12} className="mr-1" />
                        </div>
                        <div className="text-sm font-bold text-gray-700">{monthMetrics.percentOfLife}<span className="text-xs font-normal text-gray-500">%</span></div>
                    </div>
                </div>

                {/* Composite Sleep Score */}
                <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 flex items-center">
                      <Star size={14} className="mr-1 text-violet-400" />
                      Sleep Score
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      compositeScore >= 85 ? 'bg-violet-100 text-violet-700' :
                      compositeScore >= 70 ? 'bg-blue-100 text-blue-700' :
                      compositeScore >= 55 ? 'bg-cyan-100 text-cyan-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {compositeScore >= 85 ? 'Excellent' :
                       compositeScore >= 70 ? 'Good' :
                       compositeScore >= 55 ? 'Fair' : 'Improving'}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{compositeScore}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Consistency: &plusmn;{consistencyVar}min
                  </div>
                </div>
            </div>
        </div>

        {/* Log Sleep Button */}
        <button
          onClick={() => setShowLogModal(true)}
          className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center"
        >
          <Bed className="mr-2" /> Log Sleep
        </button>
      </div>

      {/* Impact Section */}
      <div>
          <div className="flex items-center mb-3 px-2">
              <Brain className="w-4 h-4 text-indigo-500 mr-2" />
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Sleep Benefits</h3>
          </div>

          <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Last Night</h4>
              <div className="grid grid-cols-3 gap-3">
                {todayImpactDetails.map((stat, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl border border-indigo-200 text-center">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-lg font-bold text-gray-900 leading-none">{stat.value}</div>
                        <div className="text-[10px] font-bold uppercase text-indigo-600 mt-1">{stat.label}</div>
                    </div>
                ))}
              </div>
          </div>

          <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">This Month</h4>
              <div className="grid grid-cols-3 gap-3">
                {monthImpactDetails.map((stat, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-lg font-bold text-gray-900 leading-none">{stat.value}</div>
                        <div className="text-[10px] font-bold uppercase text-gray-500 mt-1">{stat.label}</div>
                        <div className="text-[9px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full mt-1.5">
                            {stat.detail}
                        </div>
                    </div>
                ))}
              </div>
          </div>
      </div>

      {/* Sleep Tip (AI) */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start">
          <div className="bg-white/20 p-2 rounded-lg mr-3">
            <Moon size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase opacity-75 tracking-wider mb-1">Sleep Wisdom</h3>
            <p className="font-medium leading-relaxed text-sm">{tip}</p>
          </div>
        </div>
      </div>
      
      {/* Rewards Layout */}
      <div className="grid grid-cols-1 gap-6">
          
          {/* WEEKLY RAFFLE CARD */}
          <div className="bg-gradient-to-br from-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="flex justify-between items-start mb-4 relative z-10">
                 <div>
                     <h3 className="text-lg font-bold flex items-center text-white mb-1"><Ticket className="mr-2 text-purple-300" /> Week {currentWeek} Prize</h3>
                     {prizes.find(p => p.week_number === currentWeek) && (
                       <div className="mt-2 bg-purple-700/50 rounded-lg p-2 border border-purple-500/30">
                         <div className="flex items-center gap-2">
                           <span className="text-2xl">{prizes.find(p => p.week_number === currentWeek)?.emoji}</span>
                           <div>
                             <p className="text-sm font-bold text-white">{prizes.find(p => p.week_number === currentWeek)?.title}</p>
                             <p className="text-xs text-purple-200">{prizes.find(p => p.week_number === currentWeek)?.description}</p>
                           </div>
                         </div>
                       </div>
                     )}
                     <p className="text-purple-200 text-xs mt-2">Hit 60% of weekly goal ({RAFFLE_THRESHOLD_HOURS.toFixed(1)}h)</p>
                 </div>
             </div>
             
             <div className="mb-4 relative z-10">
                 <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-wider">
                     <span className="text-purple-200">Your Progress</span>
                     <span className={weeklyHours >= RAFFLE_THRESHOLD_HOURS ? "text-white" : "text-purple-300"}>
                        {Math.round(weeklyPercentage)}%
                     </span>
                 </div>
                 <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden">
                     <div 
                        style={{ width: `${weeklyPercentage}%` }}
                        className="h-full rounded-full transition-all duration-1000 bg-purple-400"
                     ></div>
                 </div>
                 <p className="text-right text-[10px] mt-1 text-purple-300">{weeklyHours.toFixed(1)} / {RAFFLE_THRESHOLD_HOURS.toFixed(1)} hours</p>
             </div>
             
             <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-purple-100 uppercase tracking-wider flex items-center">
                        <Users size={12} className="mr-1"/> Qualifiers ({weeklyParticipants.length})
                    </p>
                    
                    {hasEnteredWeekly ? (
                        <span className="flex items-center text-[10px] bg-purple-500 text-white px-2 py-1 rounded-md font-bold shadow-sm">
                            <CheckCircle2 size={10} className="mr-1" /> Entered
                        </span>
                    ) : (
                        weeklyHours >= RAFFLE_THRESHOLD_HOURS && (
                            <button 
                                onClick={handleEnterWeeklyRaffle}
                                className="text-[10px] bg-white text-indigo-900 px-3 py-1 rounded-md font-bold hover:bg-purple-50 shadow-sm"
                            >
                                Enter Now
                            </button>
                        )
                    )}
                </div>
                
                {weeklyParticipants.length === 0 ? (
                    <p className="text-xs text-purple-300/60 italic text-center py-2">Be the first to qualify!</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {weeklyParticipants.map(p => (
                            <div key={p.id} className={`flex items-center p-2 rounded-lg transition-colors ${p.id === user.id ? 'bg-purple-500/40 border border-purple-400/50' : 'bg-black/20'}`}>
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100/10 text-sm mr-2">
                                    {p.avatar_emoji}
                                </div>
                                <span className={`text-xs font-medium truncate ${p.id === user.id ? 'text-white' : 'text-purple-100'}`}>
                                    {p.username}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* GRAND PRIZE CARD */}
          {showGrandPrize ? (
          <div className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border-t-4 border-yellow-400">
             <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-yellow-400 opacity-10 rounded-full blur-3xl"></div>

             <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="w-full">
                     <h3 className="text-lg font-bold flex items-center text-white mb-1"><Crown className="mr-2 text-yellow-400" /> Grand Prize Unlocked!</h3>
                     {prizes.find(p => p.prize_type === 'grand') && (
                       <div className="mt-2 bg-yellow-500/20 rounded-lg p-3 border border-yellow-400/40">
                         <div className="flex items-center gap-3">
                           <span className="text-4xl">{prizes.find(p => p.prize_type === 'grand')?.emoji}</span>
                           <div>
                             <p className="text-base font-bold text-yellow-100">{prizes.find(p => p.prize_type === 'grand')?.title}</p>
                             <p className="text-sm text-indigo-200">{prizes.find(p => p.prize_type === 'grand')?.description}</p>
                           </div>
                         </div>
                       </div>
                     )}
                     <p className="text-indigo-200 text-xs mt-2">Hit 70% of Jan goal ({GRAND_PRIZE_THRESHOLD_HOURS.toFixed(1)}h)</p>
                 </div>
             </div>
             
             <div className="mb-4 relative z-10">
                 <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-wider">
                     <span className="text-indigo-200">Month Progress</span>
                     <span className={totalMonthHours >= GRAND_PRIZE_THRESHOLD_HOURS ? "text-yellow-400" : "text-indigo-300"}>
                        {Math.round(grandPercentage)}%
                     </span>
                 </div>
                 <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden">
                     <div 
                        style={{ width: `${grandPercentage}%` }}
                        className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-yellow-400 to-orange-500"
                     ></div>
                 </div>
                 <p className="text-right text-[10px] mt-1 text-indigo-300">{totalMonthHours.toFixed(1)} / {GRAND_PRIZE_THRESHOLD_HOURS.toFixed(1)} hours</p>
             </div>
             
             <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider flex items-center">
                        <Users size={12} className="mr-1"/> Dream Team ({grandParticipants.length})
                    </p>
                    
                    {hasEnteredGrand ? (
                        <span className="flex items-center text-[10px] bg-yellow-500 text-indigo-900 px-2 py-1 rounded-md font-bold shadow-sm">
                            <CheckCircle2 size={10} className="mr-1" /> Locked In
                        </span>
                    ) : (
                         totalMonthHours >= GRAND_PRIZE_THRESHOLD_HOURS && (
                            <button 
                                onClick={handleEnterGrandPrize}
                                className="text-[10px] bg-yellow-400 text-indigo-900 px-3 py-1 rounded-md font-bold hover:bg-yellow-300 shadow-sm"
                            >
                                Unlock
                            </button>
                        )
                    )}
                </div>
                
                {grandParticipants.length === 0 ? (
                    <p className="text-xs text-indigo-300/60 italic text-center py-2">The podium awaits...</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {grandParticipants.map(p => (
                            <div key={p.id} className={`flex items-center p-2 rounded-lg transition-colors ${p.id === user.id ? 'bg-yellow-500/20 border border-yellow-400/50' : 'bg-black/20'}`}>
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100/10 text-sm mr-2">
                                    {p.avatar_emoji}
                                </div>
                                <span className={`text-xs font-medium truncate ${p.id === user.id ? 'text-yellow-100' : 'text-indigo-100'}`}>
                                    {p.username}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border-2 border-dashed border-gray-600">
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Grand Prize Locked</h3>
                <p className="text-gray-400 text-sm">
                  Team must reach 50% of company goal to unlock!
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Current progress: {companyProgress.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

      </div>

      {/* Prize Tracker */}
      <PrizeTracker />

      {/* Badges Section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Medal className="mr-2 text-yellow-500" /> Badges
        </h3>
        <div className="grid grid-cols-2 gap-3">
            {badges.map(badge => (
                <div key={badge.id} className={`p-3 rounded-xl border flex items-center ${badge.earned ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                    <div className="text-2xl mr-3">{badge.earned ? badge.icon : '🔒'}</div>
                    <div>
                        <p className={`text-sm font-bold ${badge.earned ? 'text-gray-900' : 'text-gray-500'}`}>{badge.label}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{badge.description}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      {/* Connection Status Footer */}
      {!isOnline && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 text-red-700 border border-red-200 shadow-lg rounded-full px-4 py-2 flex items-center text-xs font-bold animate-bounce">
            <WifiOff size={14} className="mr-2" /> 
            Offline Mode
            <button onClick={() => fetchData()} className="ml-3 bg-white border border-red-200 rounded-full p-1 hover:bg-red-50">
                <RefreshCw size={12} />
            </button>
        </div>
      )}

      {/* LOG SLEEP MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Log Sleep</h2>
              <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>

            {/* Date Picker */}
            <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center">
                <Calendar size={14} className="mr-1.5 text-indigo-600" />
                Sleep Date (Night of)
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })}
                className="w-full border border-indigo-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
            </div>

            {/* Sleep Log Form */}
                 <div className="space-y-4">
                     {/* Bedtime & Wake Time */}
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center">
                                 <Moon size={14} className="mr-1 text-indigo-500"/> Bedtime
                             </label>
                             <input 
                                type="time" 
                                value={bedtime} 
                                onChange={(e) => setBedtime(e.target.value)} 
                                className="w-full border border-gray-200 rounded-xl p-3 font-bold text-gray-900 outline-none focus:border-indigo-500 text-center text-lg" 
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center">
                                 <Sun size={14} className="mr-1 text-yellow-500"/> Wake Time
                             </label>
                             <input 
                                type="time" 
                                value={wakeTime} 
                                onChange={(e) => setWakeTime(e.target.value)} 
                                className="w-full border border-gray-200 rounded-xl p-3 font-bold text-gray-900 outline-none focus:border-indigo-500 text-center text-lg" 
                             />
                         </div>
                     </div>
                     
                     {/* Calculated Hours Preview */}
                     <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                         <p className="text-indigo-600 text-xs font-bold uppercase mb-1">Total Sleep</p>
                         <p className="text-3xl font-bold text-indigo-900">{calculatedHours.toFixed(1)} <span className="text-base font-normal">hours</span></p>
                     </div>

                     {/* Quality Rating */}
                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-2 text-center uppercase tracking-wider">
                             Sleep Quality (Optional)
                         </label>
                         {renderQualityStars()}
                         {qualityRating > 0 && (
                           <p className="text-center text-xs text-gray-500 mt-1">
                             {qualityRating === 1 && "Poor - Restless night"}
                             {qualityRating === 2 && "Fair - Woke up several times"}
                             {qualityRating === 3 && "Good - Decent rest"}
                             {qualityRating === 4 && "Great - Slept well"}
                             {qualityRating === 5 && "Excellent - Best sleep ever!"}
                           </p>
                         )}
                     </div>

                     {/* Advanced Metrics Toggle */}
                     <button
                       type="button"
                       onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                       className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                     >
                       <span className="flex items-center text-sm font-medium text-gray-700">
                         <Activity size={16} className="mr-2 text-indigo-500" />
                         Advanced Sleep Metrics
                         <span className="ml-2 text-xs text-gray-400">(from wearable/app)</span>
                       </span>
                       {showAdvancedMetrics ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                     </button>

                     {/* Advanced Metrics Inputs */}
                     {showAdvancedMetrics && (
                       <div className="space-y-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                         <p className="text-xs text-gray-500 mb-2">
                           Enter data from your Oura, Apple Watch, Fitbit, Whoop, or other sleep tracker.
                         </p>
                         
                         {/* Sleep Score */}
                         <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1">
                             Sleep Score (0-100)
                           </label>
                           <input
                             type="number"
                             min="0"
                             max="100"
                             value={sleepScore}
                             onChange={(e) => setSleepScore(e.target.value)}
                             placeholder="e.g., 85"
                             className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                           />
                           {sleepScore && parseInt(sleepScore) > 0 && (
                             <div className={`mt-1 text-xs px-2 py-1 rounded inline-block ${getSleepScoreColor(parseInt(sleepScore))}`}>
                               {parseInt(sleepScore) >= 85 ? 'Excellent!' : parseInt(sleepScore) >= 70 ? 'Good' : parseInt(sleepScore) >= 50 ? 'Fair' : 'Poor'}
                             </div>
                           )}
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                           {/* Deep Sleep */}
                           <div>
                             <label className="block text-xs font-bold text-purple-700 mb-1 flex items-center">
                               💜 Deep Sleep
                             </label>
                             <div className="relative">
                               <input
                                 type="number"
                                 min="0"
                                 value={deepSleepMin}
                                 onChange={(e) => setDeepSleepMin(e.target.value)}
                                 placeholder="mins"
                                 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                               />
                               <span className="absolute right-3 top-2 text-xs text-gray-400">min</span>
                             </div>
                             <p className="text-[10px] text-gray-400 mt-0.5">Ideal: 60-120 min</p>
                           </div>

                           {/* REM Sleep */}
                           <div>
                             <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center">
                               💙 REM Sleep
                             </label>
                             <div className="relative">
                               <input
                                 type="number"
                                 min="0"
                                 value={remSleepMin}
                                 onChange={(e) => setRemSleepMin(e.target.value)}
                                 placeholder="mins"
                                 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                               />
                               <span className="absolute right-3 top-2 text-xs text-gray-400">min</span>
                             </div>
                             <p className="text-[10px] text-gray-400 mt-0.5">Ideal: 90-120 min</p>
                           </div>

                           {/* Light Sleep */}
                           <div>
                             <label className="block text-xs font-bold text-cyan-700 mb-1 flex items-center">
                               🩵 Light Sleep
                             </label>
                             <div className="relative">
                               <input
                                 type="number"
                                 min="0"
                                 value={lightSleepMin}
                                 onChange={(e) => setLightSleepMin(e.target.value)}
                                 placeholder="mins"
                                 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                               />
                               <span className="absolute right-3 top-2 text-xs text-gray-400">min</span>
                             </div>
                             <p className="text-[10px] text-gray-400 mt-0.5">Typically 50-60%</p>
                           </div>

                           {/* Awake Time */}
                           <div>
                             <label className="block text-xs font-bold text-orange-700 mb-1 flex items-center">
                               🧡 Awake
                             </label>
                             <div className="relative">
                               <input
                                 type="number"
                                 min="0"
                                 value={awakeMin}
                                 onChange={(e) => setAwakeMin(e.target.value)}
                                 placeholder="mins"
                                 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                               />
                               <span className="absolute right-3 top-2 text-xs text-gray-400">min</span>
                             </div>
                             <p className="text-[10px] text-gray-400 mt-0.5">Ideal: &lt;30 min</p>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* AI Screenshot Analysis Section */}
                     <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border-2 border-dashed border-indigo-200 p-4">
                         <div className="flex items-center justify-between mb-3">
                           <label className="text-sm font-bold text-indigo-700 flex items-center">
                             <Sparkles size={16} className="mr-2" />
                             AI Screenshot Scanner
                           </label>
                           <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                             Beta
                           </span>
                         </div>
                         
                         <p className="text-xs text-gray-600 mb-3">
                           Upload screenshots from Eight Sleep, Oura, Apple Watch, or other sleep trackers. Our AI will extract your sleep data automatically!
                         </p>
                         
                         <input
                           type="file"
                           accept="image/*"
                           multiple
                           onChange={(e) => {
                             const files = Array.from(e.target.files || []);
                             setScreenshotFiles(files);
                             setScanError(null);
                             setShowReviewCard(false);
                             setExtractedData(null);
                           }}
                           className="w-full border border-indigo-200 rounded-lg p-2 text-sm text-gray-600 bg-white mb-3"
                         />
                         
                         {screenshotFiles.length > 0 && (
                           <div className="mb-3">
                             <p className="text-xs text-indigo-600 font-medium mb-1">
                               {screenshotFiles.length} file{screenshotFiles.length > 1 ? 's' : ''} selected:
                             </p>
                             <div className="flex flex-wrap gap-1">
                               {screenshotFiles.map((file, idx) => (
                                 <span key={idx} className="text-[10px] bg-white px-2 py-1 rounded border border-indigo-100 text-gray-600">
                                   {file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name}
                                 </span>
                               ))}
                             </div>
                           </div>
                         )}
                         
                         {screenshotFiles.length > 0 && !showReviewCard && (
                           <button
                             type="button"
                             onClick={handleScanScreenshots}
                             disabled={isScanning}
                             className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:from-violet-600 hover:to-indigo-700 transition-all disabled:opacity-60"
                           >
                             {isScanning ? (
                               <>
                                 <Loader2 size={16} className="animate-spin" />
                                 Analyzing Screenshots...
                               </>
                             ) : (
                               <>
                                 <Camera size={16} />
                                 Scan Screenshots
                               </>
                             )}
                           </button>
                         )}
                         
                         {scanError && (
                           <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                             <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                             <p className="text-xs text-red-700">{scanError}</p>
                           </div>
                         )}
                     </div>
                     
                     {/* AI Extracted Data Review Card */}
                     {showReviewCard && extractedData && (
                       <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-4">
                         <div className="flex items-center justify-between mb-3">
                           <h4 className="text-sm font-bold text-green-700 flex items-center">
                             <CheckCircle size={16} className="mr-2" />
                             AI Extracted Data
                           </h4>
                           {extractedData.detectedSource && extractedData.detectedSource !== 'unknown' && (
                             <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium capitalize">
                               {extractedData.detectedSource.replace('_', ' ')}
                             </span>
                           )}
                         </div>
                         
                         {scanWarnings.length > 0 && (
                           <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                             <p className="text-[10px] text-yellow-700 font-medium">⚠️ {scanWarnings.join(', ')}</p>
                           </div>
                         )}
                         
                         <div className="grid grid-cols-2 gap-2 mb-3">
                           {extractedData.totalSleepHours && (
                             <div className="bg-white rounded-lg p-2 border border-green-100">
                               <p className="text-[10px] text-gray-500 uppercase font-bold">Total Sleep</p>
                               <p className="text-lg font-bold text-gray-900">{extractedData.totalSleepHours.toFixed(1)}h</p>
                             </div>
                           )}
                           {extractedData.sleepScore && (
                             <div className="bg-white rounded-lg p-2 border border-green-100">
                               <p className="text-[10px] text-gray-500 uppercase font-bold">Sleep Score</p>
                               <p className="text-lg font-bold text-gray-900">{extractedData.sleepScore}</p>
                             </div>
                           )}
                           {extractedData.bedtime && (
                             <div className="bg-white rounded-lg p-2 border border-green-100">
                               <p className="text-[10px] text-gray-500 uppercase font-bold">Bedtime</p>
                               <p className="text-sm font-bold text-gray-900">{extractedData.bedtime}</p>
                             </div>
                           )}
                           {extractedData.wakeTime && (
                             <div className="bg-white rounded-lg p-2 border border-green-100">
                               <p className="text-[10px] text-gray-500 uppercase font-bold">Wake Time</p>
                               <p className="text-sm font-bold text-gray-900">{extractedData.wakeTime}</p>
                             </div>
                           )}
                           {extractedData.deepSleepMin && (
                             <div className="bg-white rounded-lg p-2 border border-purple-100">
                               <p className="text-[10px] text-purple-600 uppercase font-bold">💜 Deep</p>
                               <p className="text-sm font-bold text-gray-900">{extractedData.deepSleepMin} min</p>
                             </div>
                           )}
                           {extractedData.remSleepMin && (
                             <div className="bg-white rounded-lg p-2 border border-blue-100">
                               <p className="text-[10px] text-blue-600 uppercase font-bold">💙 REM</p>
                               <p className="text-sm font-bold text-gray-900">{extractedData.remSleepMin} min</p>
                             </div>
                           )}
                           {extractedData.lightSleepMin && (
                             <div className="bg-white rounded-lg p-2 border border-cyan-100">
                               <p className="text-[10px] text-cyan-600 uppercase font-bold">🩵 Light</p>
                               <p className="text-sm font-bold text-gray-900">{extractedData.lightSleepMin} min</p>
                             </div>
                           )}
                           {extractedData.awakeMin !== undefined && extractedData.awakeMin !== null && (
                             <div className="bg-white rounded-lg p-2 border border-orange-100">
                               <p className="text-[10px] text-orange-600 uppercase font-bold">🧡 Awake</p>
                               <p className="text-sm font-bold text-gray-900">{extractedData.awakeMin} min</p>
                             </div>
                           )}
                         </div>
                         
                         {extractedData.confidence !== undefined && (
                           <p className="text-[10px] text-gray-500 mb-3 text-center">
                             AI Confidence: {Math.round(extractedData.confidence * 100)}%
                           </p>
                         )}
                         
                         <p className="text-xs text-gray-600 mb-3 text-center">
                           <Edit3 size={12} className="inline mr-1" />
                           Data has been filled in the form below. Review and edit if needed.
                         </p>
                         
                         <div className="flex gap-2">
                           <button
                             type="button"
                             onClick={handleConfirmExtractedData}
                             className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 hover:bg-green-600 transition-colors"
                           >
                             <CheckCircle size={14} />
                             Looks Good
                           </button>
                           <button
                             type="button"
                             onClick={handleDiscardExtractedData}
                             className="px-4 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
                           >
                             Clear
                           </button>
                         </div>
                       </div>
                     )}

                     {/* Notes */}
                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-2">Notes (Optional)</label>
                         <textarea
                           value={notes}
                           onChange={(e) => setNotes(e.target.value)}
                           placeholder="How did you sleep? Any dreams?"
                           className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-indigo-500 resize-none"
                           rows={2}
                         />
                     </div>
                 </div>

            {/* Submit Action */}
              <button
                  disabled={isSubmitting || calculatedHours === 0}
                  onClick={handleLogSubmit}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg mt-6 disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center"
              >
                  {isSubmitting ? 'Saving...' : `Log ${calculatedHours.toFixed(1)} Hours`}
              </button>

          </div>
        </div>
      )}

      {/* Milestone Celebration Modal */}
      {showMilestoneCelebration && milestoneData && milestoneData.grandPrize && (
        <MilestoneCelebration
          grandPrize={milestoneData.grandPrize}
          totalHours={milestoneData.totalHours}
          triggeredBy={milestoneData.triggeredBy}
          onClose={handleMilestoneClose}
        />
      )}
    </div>
  );
};

export default Dashboard;
