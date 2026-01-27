import React, { useState, useEffect } from 'react';
import { User, SleepLog } from '../types';
import { db } from '../services/dataService';
import { BONUS_ACTIVITIES, calculateSleepHours } from '../constants';
import {
  Pencil,
  Trash2,
  X,
  Check,
  Calendar,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Star,
  Image
} from 'lucide-react';

interface MyEntriesProps {
  user: User;
}

const BONUS_TYPES = BONUS_ACTIVITIES.map(b => b.type);

const MyEntries: React.FC<MyEntriesProps> = ({ user }) => {
  const [entries, setEntries] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Edit form state
  const [editBedtime, setEditBedtime] = useState('');
  const [editWakeTime, setEditWakeTime] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editQuality, setEditQuality] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grouping
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Screenshot viewer
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    const logs = await db.getUserLogs(user.id);
    setEntries(logs);
    setLoading(false);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterday = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    setExpandedDates(new Set([today, yesterday]));
  };

  useEffect(() => {
    fetchEntries();
  }, [user.id]);

  const startEdit = (entry: SleepLog) => {
    setEditingId(entry.id);
    setEditBedtime(entry.bedtime || '22:00');
    setEditWakeTime(entry.wake_time || '06:00');
    setEditDate(entry.date_logged);
    setEditQuality(entry.quality_rating || 0);
    setDeleteConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBedtime('');
    setEditWakeTime('');
    setEditDate('');
    setEditQuality(0);
  };

  const handleUpdate = async (entryId: number) => {
    if (isSubmitting || !editDate) return;
    setIsSubmitting(true);

    const calculatedHours = calculateSleepHours(editBedtime, editWakeTime);

    const success = await db.updateLog(
      entryId,
      calculatedHours,
      '', // No bonus type for regular sleep
      editDate
    );

    if (success) {
      await fetchEntries();
      cancelEdit();
    } else {
      alert('Failed to update entry. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (entryId: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const success = await db.deleteLog(entryId);

    if (success) {
      await fetchEntries();
      setDeleteConfirmId(null);
    } else {
      alert('Failed to delete entry. Please try again.');
    }
    setIsSubmitting(false);
  };

  const toggleDateExpand = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.date_logged;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, SleepLog[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

    if (dateStr === todayStr) {
      return 'Last Night';
    }
    if (dateStr === yesterdayStr) {
      return '2 Nights Ago';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEntryIcon = (entry: SleepLog) => {
    if (entry.bonus_type) {
      return '🎯';
    }
    if (entry.sleep_hours >= 8) {
      return '😴';
    }
    if (entry.sleep_hours >= 6) {
      return '🌙';
    }
    return '💤';
  };

  const formatTime = (time: string) => {
    if (!time || time === '00:00') return '--:--';
    const [hour, min] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  const renderQualityStars = (rating: number) => {
    if (!rating) return null;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`text-xs ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const totalHours = entries.reduce((sum, e) => sum + e.sleep_hours, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Moon className="mr-2 text-indigo-500" size={24} />
              My Sleep Log
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all your sleep entries
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">
              {totalHours.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Total Sleep
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
          <span>{entries.length} entries</span>
          <span>{sortedDates.length} nights logged</span>
        </div>
      </div>

      {/* Entries by Date */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-3">😴</div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No sleep logged yet</h3>
          <p className="text-gray-500 text-sm">
            Start logging your sleep from the Dashboard!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(date => {
            const dateEntries = groupedEntries[date];
            const dayTotal = dateEntries.reduce((sum, e) => sum + e.sleep_hours, 0);
            const isExpanded = expandedDates.has(date);

            return (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Date Header - Clickable */}
                <button
                  onClick={() => toggleDateExpand(date)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Calendar size={18} className="text-gray-400 mr-3" />
                    <div className="text-left">
                      <div className="font-bold text-gray-900">{formatDate(date)}</div>
                      <div className="text-xs text-gray-500">{dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-right mr-3">
                      <div className="font-bold text-indigo-600">{dayTotal.toFixed(1)}h</div>
                      <div className="text-xs text-gray-400">sleep</div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Entries List */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {dateEntries.map(entry => (
                      <div
                        key={entry.id}
                        className={`p-4 border-b border-gray-50 last:border-b-0 ${
                          editingId === entry.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        {editingId === entry.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-indigo-700">Editing Entry</span>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X size={18} />
                              </button>
                            </div>

                            {/* Time Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Bedtime</label>
                                <input
                                  type="time"
                                  value={editBedtime}
                                  onChange={(e) => setEditBedtime(e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Wake Time</label>
                                <input
                                  type="time"
                                  value={editWakeTime}
                                  onChange={(e) => setEditWakeTime(e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                            </div>

                            {/* Date Input */}
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                max={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>

                            {/* Calculated Preview */}
                            <div className="bg-indigo-100 rounded-lg p-2 text-center">
                              <span className="text-sm font-bold text-indigo-700">
                                {calculateSleepHours(editBedtime, editWakeTime).toFixed(1)} hours
                              </span>
                            </div>

                            {/* Save/Cancel Buttons */}
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleUpdate(entry.id)}
                                disabled={isSubmitting}
                                className="flex-1 bg-indigo-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center"
                              >
                                <Check size={16} className="mr-1" />
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : deleteConfirmId === entry.id ? (
                          // Delete Confirmation
                          <div className="bg-red-50 rounded-xl p-4">
                            <div className="flex items-start">
                              <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-red-800 mb-1">Delete this entry?</p>
                                <p className="text-xs text-red-600 mb-3">
                                  This will remove {entry.sleep_hours.toFixed(1)} hours from your total. This cannot be undone.
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    disabled={isSubmitting}
                                    className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-600 disabled:opacity-50"
                                  >
                                    {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-4 py-1.5 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-white"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Normal View
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg mr-3">
                                {getEntryIcon(entry)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 flex items-center gap-2">
                                  {entry.sleep_hours.toFixed(1)} hours
                                  {entry.quality_rating && renderQualityStars(entry.quality_rating)}
                                </div>
                                {entry.bonus_type ? (
                                  <div className="text-xs text-purple-600 font-medium">
                                    {entry.bonus_type.replace('Bonus: ', '')}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <span className="flex items-center">
                                      <Moon size={10} className="mr-0.5" /> {formatTime(entry.bedtime)}
                                    </span>
                                    <span>→</span>
                                    <span className="flex items-center">
                                      <Sun size={10} className="mr-0.5" /> {formatTime(entry.wake_time)}
                                    </span>
                                  </div>
                                )}
                                {entry.notes && (
                                  <p className="text-xs text-gray-400 mt-1 italic">"{entry.notes}"</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {entry.screenshot_url && (
                                <button
                                  onClick={() => setViewingScreenshot(entry.screenshot_url!)}
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="View screenshot"
                                >
                                  <Image size={16} />
                                </button>
                              )}
                              {!entry.bonus_type && (
                                <button
                                  onClick={() => startEdit(entry)}
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Edit entry"
                                >
                                  <Pencil size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(entry.id);
                                  setEditingId(null);
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      {viewingScreenshot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewingScreenshot(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <button
              onClick={() => setViewingScreenshot(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <img 
              src={viewingScreenshot} 
              alt="Sleep screenshot" 
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEntries;
