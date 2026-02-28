import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/dataService';
import { calculateCompositeScore, calculateConsistencyVariation } from '../constants';
import { TrendingUp, TrendingDown, BarChart3, Sparkles, CheckCircle, Loader2 } from 'lucide-react';

interface SleepInsightsProps {
  user: User;
}

const SleepInsights: React.FC<SleepInsightsProps> = ({ user }) => {
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<{
    summary: string; grade: string; strengths: string[]; improvements: string[]; sleepTip: string;
  } | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [compositeScore, setCompositeScore] = useState(0);
  const [consistencyVar, setConsistencyVar] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allUserLogs = await db.getUserLogs(user.id);
        const sleepLogs = allUserLogs.filter((l: any) => !l.bonus_type);
        const last14 = sleepLogs.slice(0, 14).reverse(); // oldest first for charts
        setRecentLogs(last14);

        // Compute consistency & composite score
        const recent7 = sleepLogs.slice(0, 7);
        const consistency = calculateConsistencyVariation(recent7);
        setConsistencyVar(Math.round(consistency.avgVariation));
        const sleepOnly = recent7.filter((l: any) => !l.bonus_type);
        const avgHours = sleepOnly.length > 0
          ? sleepOnly.reduce((sum: number, l: any) => sum + l.sleep_hours, 0) / sleepOnly.length
          : 0;
        const score = calculateCompositeScore(avgHours, consistency.avgVariation);
        setCompositeScore(score.total);

        // Compute streak
        let s = 0;
        for (const log of sleepLogs) {
          if (log.sleep_hours >= 7) s++;
          else break;
        }
        setStreak(s);
      } catch (err) {
        console.error('Failed to fetch sleep insights data:', err);
      }
    };
    fetchData();
  }, [user.id]);

  if (recentLogs.length < 2) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="mr-2 text-indigo-500" /> My Sleep
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium mb-1">Not enough data yet</p>
          <p className="text-sm">Log at least 2 nights of sleep to see your trends, charts, and AI analysis!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center">
        <BarChart3 className="mr-2 text-indigo-500" /> My Sleep
      </h2>

      {/* --- Sleep Duration Trend (Last 14 days) --- */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Sleep Duration Trend</h4>
        <div className="space-y-1.5">
          {recentLogs.map((log, i) => {
            const hours = log.sleep_hours;
            const maxBar = 10;
            const pct = Math.min(100, (hours / maxBar) * 100);
            const color = hours < 6 ? 'bg-red-400' : hours < 7 ? 'bg-amber-400' : hours <= 8.5 ? 'bg-emerald-400' : 'bg-blue-400';
            const dateLabel = log.date_logged.slice(5); // MM-DD
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-12 text-right font-mono">{dateLabel}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-500`}
                    style={{ width: pct + '%' }}
                  />
                  {/* 7.5h goal line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-gray-400 opacity-40"
                    style={{ left: ((7.5 / maxBar) * 100) + '%' }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 w-10 text-right">{hours.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-3 mt-2 text-[9px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt;6h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 6-7h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> 7-8.5h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> &gt;8.5h</span>
          <span className="flex items-center gap-1"><span className="w-0.5 h-2 border-l-2 border-dashed border-gray-400 inline-block" /> Goal</span>
        </div>
      </div>

      {/* --- Sleep Schedule Timeline --- */}
      {recentLogs.filter(l => l.bedtime && l.bedtime !== '00:00').length >= 2 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Sleep Schedule</h4>
          {(() => {
            const logsWithTimes = recentLogs.filter(l => l.bedtime && l.bedtime !== '00:00' && l.wake_time && l.wake_time !== '00:00');
            // Convert time to decimal hours, normalizing bedtime past midnight
            const toBedDec = (t: string) => {
              const [h, m] = t.split(':').map(Number);
              return h < 12 ? 24 + h + m / 60 : h + m / 60; // <12 = next day
            };
            const toWakeDec = (t: string) => {
              const [h, m] = t.split(':').map(Number);
              return 24 + h + m / 60; // always next day for alignment
            };
            const formatTime12 = (t: string) => {
              const [h, m] = t.split(':').map(Number);
              const ampm = h >= 12 ? 'PM' : 'AM';
              const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
              return h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
            };

            // Chart range: 9 PM (21) to 9 AM (33)
            const chartMin = 21;
            const chartMax = 33;
            const toPct = (val: number) => Math.max(0, Math.min(100, ((val - chartMin) / (chartMax - chartMin)) * 100));

            // Compute averages
            const bedDecs = logsWithTimes.map(l => toBedDec(l.bedtime));
            const wakeDecs = logsWithTimes.map(l => toWakeDec(l.wake_time));
            const avgBed = bedDecs.reduce((a, b) => a + b, 0) / bedDecs.length;
            const avgWake = wakeDecs.reduce((a, b) => a + b, 0) / wakeDecs.length;
            const avgBedH = Math.floor(avgBed >= 24 ? avgBed - 24 : avgBed);
            const avgBedM = Math.round((avgBed % 1) * 60);
            const avgWakeH = Math.floor(avgWake >= 24 ? avgWake - 24 : avgWake);
            const avgWakeM = Math.round((avgWake % 1) * 60);
            const fmtAvg = (h: number, m: number) => {
              const ampm = h >= 12 ? 'PM' : 'AM';
              const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
              return h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
            };

            return (
              <div className="space-y-2">
                {logsWithTimes.map((log, i) => {
                  const bedDec = toBedDec(log.bedtime);
                  const wakeDec = toWakeDec(log.wake_time);
                  const leftPct = toPct(bedDec);
                  const widthPct = toPct(wakeDec) - leftPct;
                  const dateLabel = log.date_logged.slice(5);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-12 text-right font-mono">{dateLabel}</span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                        {/* Sleep bar */}
                        <div
                          className="absolute top-1 bottom-1 bg-gradient-to-r from-indigo-500 to-violet-400 rounded-md flex items-center justify-center"
                          style={{ left: leftPct + '%', width: Math.max(widthPct, 2) + '%' }}
                        >
                          <span className="text-[9px] text-white font-bold whitespace-nowrap px-1">{log.sleep_hours.toFixed(1)}h</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-500 w-28 text-right">
                        <span className="text-indigo-600 font-medium">{formatTime12(log.bedtime)}</span>
                        <span className="mx-0.5">-</span>
                        <span className="text-amber-600 font-medium">{formatTime12(log.wake_time)}</span>
                      </div>
                    </div>
                  );
                })}
                {/* Time axis labels */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-12" />
                  <div className="flex-1 flex justify-between text-[9px] text-gray-300 px-0.5">
                    <span>9PM</span><span>11PM</span><span>1AM</span><span>3AM</span><span>5AM</span><span>7AM</span><span>9AM</span>
                  </div>
                  <span className="w-28" />
                </div>
                {/* Averages */}
                <div className="flex items-center justify-center gap-4 mt-1 text-[10px]">
                  <span className="text-gray-500">Avg Bed: <strong className="text-indigo-600">{fmtAvg(avgBedH, avgBedM)}</strong></span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">Avg Wake: <strong className="text-amber-600">{fmtAvg(avgWakeH, avgWakeM)}</strong></span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* --- Weekly Summary Cards --- */}
      {recentLogs.length >= 3 && (() => {
        const last7 = recentLogs.slice(-7);
        const prev7 = recentLogs.length > 7 ? recentLogs.slice(0, Math.min(7, recentLogs.length - 7)) : [];
        const avgH = last7.reduce((s, l) => s + l.sleep_hours, 0) / last7.length;
        const prevAvgH = prev7.length > 0 ? prev7.reduce((s, l) => s + l.sleep_hours, 0) / prev7.length : null;
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h < 6 ? (h + 24) * 60 + m : h * 60 + m; };
        const bedMins = last7.filter(l => l.bedtime && l.bedtime !== '00:00').map(l => toMin(l.bedtime));
        const avgBedMin = bedMins.length > 0 ? bedMins.reduce((a, b) => a + b, 0) / bedMins.length : 0;
        const avgBedH = Math.floor((avgBedMin % 1440) / 60);
        const avgBedM = Math.round(avgBedMin % 60);
        const wakeMins = last7.filter(l => l.wake_time && l.wake_time !== '00:00').map(l => { const [h, m] = l.wake_time.split(':').map(Number); return h * 60 + m; });
        const avgWakeMin = wakeMins.length > 0 ? wakeMins.reduce((a, b) => a + b, 0) / wakeMins.length : 0;
        const avgWakeH = Math.floor(avgWakeMin / 60);
        const avgWakeM = Math.round(avgWakeMin % 60);
        const formatTime12 = (h: number, m: number) => {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          return h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
        };
        const delta = prevAvgH !== null ? avgH - prevAvgH : null;
        return (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">This Week at a Glance</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl border border-indigo-100 text-center">
                <p className="text-[10px] text-indigo-600 font-bold uppercase">Avg Hours</p>
                <p className="text-xl font-bold text-gray-900">{avgH.toFixed(1)}</p>
                {delta !== null && (
                  <p className={"text-[10px] font-medium flex items-center justify-center gap-0.5 " + (delta >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {delta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)}h
                  </p>
                )}
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-pink-50 p-3 rounded-xl border border-violet-100 text-center">
                <p className="text-[10px] text-violet-600 font-bold uppercase">Avg Bedtime</p>
                <p className="text-sm font-bold text-gray-900">{bedMins.length > 0 ? formatTime12(avgBedH >= 24 ? avgBedH - 24 : avgBedH, avgBedM) : '--'}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-xl border border-amber-100 text-center">
                <p className="text-[10px] text-amber-600 font-bold uppercase">Avg Wake</p>
                <p className="text-sm font-bold text-gray-900">{wakeMins.length > 0 ? formatTime12(avgWakeH, avgWakeM) : '--'}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Consistency</p>
                <p className="text-sm font-bold text-gray-900">&#177;{consistencyVar}min</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Score</p>
                <p className="text-sm font-bold text-gray-900">{compositeScore}/100</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Streak</p>
                <p className="text-sm font-bold text-gray-900">{streak} days</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- AI Analysis Card --- */}
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-violet-700 flex items-center">
            <Sparkles size={16} className="mr-2" />
            AI Sleep Consultant
          </h4>
          {aiAnalysis && (
            <span className={"text-xs px-2 py-0.5 rounded-full font-bold " + (
              aiAnalysis.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
              aiAnalysis.grade === 'B' ? 'bg-blue-100 text-blue-700' :
              aiAnalysis.grade === 'C' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            )}>
              Grade: {aiAnalysis.grade}
            </span>
          )}
        </div>

        {!aiAnalysis && !isLoadingAI && (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500 mb-3">Get personalized insights from your AI sleep consultant based on this week's data.</p>
            <button
              onClick={async () => {
                setIsLoadingAI(true);
                setAiError(false);
                try {
                  const res = await fetch('/api/ai/sleep-analysis/' + user.id);
                  if (res.ok) {
                    const data = await res.json();
                    setAiAnalysis(data.analysis);
                  } else {
                    setAiError(true);
                  }
                } catch (err) {
                  console.error('AI analysis failed:', err);
                  setAiError(true);
                } finally {
                  setIsLoadingAI(false);
                }
              }}
              className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <Sparkles size={14} />
              Get AI Analysis
            </button>
            {aiError && (
              <p className="text-xs text-red-500 mt-2">Analysis unavailable right now. Try again later.</p>
            )}
          </div>
        )}

        {isLoadingAI && (
          <div className="text-center py-6">
            <Loader2 size={24} className="animate-spin text-violet-500 mx-auto mb-2" />
            <p className="text-xs text-violet-600 font-medium">Analyzing your sleep patterns...</p>
          </div>
        )}

        {aiAnalysis && !isLoadingAI && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">{aiAnalysis.summary}</p>

            {aiAnalysis.strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Strengths</p>
                <ul className="space-y-1">
                  {aiAnalysis.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <CheckCircle size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiAnalysis.improvements.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Improvements</p>
                <ul className="space-y-1">
                  {aiAnalysis.improvements.map((s, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <TrendingUp size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white rounded-lg p-3 border border-violet-100">
              <p className="text-[10px] font-bold text-violet-600 uppercase mb-1">Personalized Tip</p>
              <p className="text-xs text-gray-700">{aiAnalysis.sleepTip}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SleepInsights;
