import React, { useEffect, useState } from 'react';
import { db } from '../services/dataService';
import { TeamStats, UserStats, DailyTeamStat, Team } from '../types';
import { calculateMetrics } from '../constants';
import { Trophy, Users, TrendingUp, BarChart3, Flag, Moon, Clock, Star } from 'lucide-react';

const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teams' | 'sleepers' | 'trends'>('teams');
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyTeamStat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const tStats = await db.getTeamStats();
      const uStats = await db.getUserStats();
      const dStats = await db.getTeamDailyHistory();
      const allTeams = await db.getAllTeams();
      
      setTeamStats(tStats);
      setUserStats(uStats);
      setDailyStats(dStats);
      setTeams(allTeams);
    };
    loadData();
  }, []);

  const getTeamColor = (teamId: number) => {
    // Sleep theme colors: 1 = Indigo/Purple (Night Owls), 2 = Violet/Pink (Dream Chasers)
    const colors = ['#818cf8', '#c084fc']; 
    return colors[(teamId - 1) % colors.length] || '#94a3b8';
  };

  // Calculate Aggregate Stats
  const totalParticipants = userStats.length;
  const totalHoursSum = userStats.reduce((acc, u) => acc + u.totalHours, 0);
  const avgHoursPerUser = totalParticipants > 0 ? Math.round((totalHoursSum / totalParticipants) * 10) / 10 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-gray-50/30">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Flag className="text-indigo-500 mr-2" size={20} />
            Squad Standings
          </h2>
        </div>
        {/* Summary Stats */}
        <div className="flex justify-between items-center text-xs text-gray-500 px-1">
          <div className="flex items-center"><Moon size={12} className="mr-1 text-gray-400"/> Avg: <strong className="ml-1 text-gray-900">{avgHoursPerUser}h</strong></div>
          <div className="flex items-center"><Users size={12} className="mr-1 text-gray-400"/> Sleepers: <strong className="ml-1 text-gray-900">{totalParticipants}</strong></div>
        </div>
      </div>

      <div className="flex p-2 bg-gray-50">
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'teams'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Teams
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'trends'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveTab('sleepers')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'sleepers'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top Sleepers
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-0">
        {activeTab === 'teams' && (
          <div className="divide-y divide-gray-100">
            {teamStats.map((stat, index) => {
              const metrics = calculateSleepMetrics(stat.totalHours);
              const leaderTotal = teamStats.length > 0 ? teamStats[0].totalHours : 0;
              const gap = leaderTotal - stat.totalHours;
              
              return (
                <div key={stat.team.id} className="p-5 hover:bg-gray-50 transition-colors">
                  {/* Team Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold mr-3 ${
                          index === 0 ? 'bg-yellow-100 text-yellow-600' :
                          index === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                      {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{stat.team.icon}</span>
                          <h3 className="font-bold text-gray-900">{stat.team.name}</h3>
                        </div>
                        <div className="flex items-center gap-1 ml-8 mt-1">
                          {stat.members.map(member => (
                            <div
                              key={member.id}
                              className="w-6 h-6 bg-gray-50 rounded-full border border-gray-200 flex items-center justify-center text-xs relative group cursor-pointer"
                            >
                              {member.avatar_emoji}
                              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                                {member.username}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-indigo-600 text-xl">{stat.totalHours.toFixed(1)}</div>
                      {index > 0 ? (
                        <div className="text-[10px] text-red-400 font-bold">-{gap.toFixed(1)}h gap</div>
                      ) : (
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Total Hours</div>
                      )}
                    </div>
                  </div>

                  {/* Team Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-center">
                      <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center justify-center">
                        <Moon size={10} className="mr-1"/> Total Hours
                      </div>
                      <div className="text-sm font-bold text-gray-800">{stat.totalHours.toFixed(1)}</div>
                    </div>
                    <div className="text-center border-l border-gray-200">
                      <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center justify-center">
                        <Clock size={10} className="mr-1"/> Avg/Person
                      </div>
                      <div className="text-sm font-bold text-gray-800">{stat.averageHours}h</div>
                    </div>
                    <div className="text-center border-l border-gray-200">
                      <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center justify-center">
                        <Star size={10} className="mr-1"/> Cycles
                      </div>
                      <div className="text-sm font-bold text-gray-800">{metrics.cycles}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="p-4">
            <div className="flex justify-center space-x-6 mb-6">
              {teams.map(t => (
                <div key={t.id} className="flex items-center text-xs font-semibold text-gray-700">
                  <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: getTeamColor(t.id)}}></div>
                  {t.name}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {dailyStats.map((day, i) => {
                const team1 = day.teams.find(t => t.teamId === 1);
                const team2 = day.teams.find(t => t.teamId === 2);
                const total = (team1?.totalHours || 0) + (team2?.totalHours || 0);
                const team1Pct = total > 0 ? ((team1?.totalHours || 0) / total) * 100 : 50;
                const team2Pct = total > 0 ? ((team2?.totalHours || 0) / total) * 100 : 50;

                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-gray-500">{day.date}</p>
                      <p className="text-xs text-gray-500"><span className="font-bold text-gray-700">{total.toFixed(1)}</span> total hours</p>
                    </div>

                    {/* Combined stacked bar */}
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex shadow-sm">
                      <div
                        style={{ width: `${team1Pct}%`, backgroundColor: getTeamColor(1) }}
                        className="h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500 hover:opacity-90"
                        title={`Night Owls: ${(team1?.totalHours || 0).toFixed(1)} hours`}
                      >
                        {team1Pct > 15 && `${(team1?.totalHours || 0).toFixed(1)}h`}
                      </div>
                      <div
                        style={{ width: `${team2Pct}%`, backgroundColor: getTeamColor(2) }}
                        className="h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500 hover:opacity-90"
                        title={`Dream Chasers: ${(team2?.totalHours || 0).toFixed(1)} hours`}
                      >
                        {team2Pct > 15 && `${(team2?.totalHours || 0).toFixed(1)}h`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 text-center text-xs text-gray-400">
              <BarChart3 size={16} className="mx-auto mb-1" />
              Showing total sleep hours per team
            </div>
          </div>
        )}

        {activeTab === 'sleepers' && (
          <div className="divide-y divide-gray-100">
            {userStats.slice(0, 10).map((stat, index) => (
              <div key={stat.user.id} className="p-4 flex items-center hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4 ${
                  index === 0 ? 'bg-yellow-100 text-yellow-600' : 
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-100 text-orange-600' : 'text-gray-400'
                }`}>
                  {index + 1}
                </div>
                <div className="relative">
                  <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-lg mr-3 border border-indigo-100">
                    {stat.user.avatar_emoji}
                  </div>
                  {stat.streak >= 3 && (
                    <div className="absolute -top-1 -right-0 bg-white rounded-full shadow-sm p-0.5 border border-indigo-100">
                      <span className="text-[10px]">🌙</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{stat.user.username}</h3>
                  <div className="text-xs text-gray-500">{stat.teamName}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{stat.totalHours.toFixed(1)}</div>
                  <div className="text-xs text-gray-400">total hours</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
