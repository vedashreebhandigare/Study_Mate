import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface HeatmapData {
  date: string;
  count: number;
}

interface StudyHeatmapProps {
  userId: string;
}

export function StudyHeatmap({ userId }: StudyHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeatmapData();
  }, [userId]);

  async function loadHeatmapData() {
    setLoading(true);
    
    // Get last 365 days of activity
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    // Aggregate activity from multiple sources
    const activityMap = new Map<string, number>();

    // Quiz completions
    const { data: quizzes } = await supabase
      .from('quiz_results')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', oneYearAgo.toISOString());

    quizzes?.forEach(q => {
      const dateKey = new Date(q.completed_at).toDateString();
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
    });

    // Flashcard reviews
    const { data: flashcards } = await supabase
      .from('flashcard_reviews')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', oneYearAgo.toISOString());

    flashcards?.forEach(f => {
      const dateKey = new Date(f.created_at).toDateString();
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
    });

    // Tutor chats
    const { data: tutorChats } = await supabase
      .from('tutor_chats')
      .select('created_at')
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', oneYearAgo.toISOString());

    tutorChats?.forEach(t => {
      const dateKey = new Date(t.created_at).toDateString();
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
    });

    // Convert to array
    const dataArray: HeatmapData[] = Array.from(activityMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    setHeatmapData(dataArray);
    setLoading(false);
  }

  function getWeeksArray() {
    const weeks: Date[][] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // 52 weeks

    // Find the Sunday before start date
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    let currentWeek: Date[] = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < 371; i++) { // 53 weeks to be safe
      currentWeek.push(new Date(currentDate));
      
      if (currentDate.getDay() === 6 || i === 370) { // Saturday or last day
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return weeks;
  }

  function getActivityLevel(date: Date): number {
    const dateKey = date.toDateString();
    const data = heatmapData.find(d => d.date === dateKey);
    return data?.count || 0;
  }

  function getColorClass(level: number): string {
    if (level === 0) return 'bg-white/5 border-white/10';
    if (level <= 2) return 'bg-purple-400/30 border-purple-400/40';
    if (level <= 5) return 'bg-purple-500/50 border-purple-500/60';
    if (level <= 10) return 'bg-purple-600/70 border-purple-600/80';
    return 'bg-purple-700/90 border-purple-700';
  }

  function formatTooltip(date: Date, level: number): string {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = date.toLocaleDateString('en-US', options);
    if (level === 0) return `${dateStr}: No activity`;
    return `${dateStr}: ${level} ${level === 1 ? 'activity' : 'activities'}`;
  }

  const weeks = getWeeksArray();
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 rounded-full bg-purple-500/20 animate-pulse" />
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="h-32 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <span>Study Activity Heatmap</span>
        </h3>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
            <div className="w-3 h-3 rounded-sm bg-purple-400/30 border border-purple-400/40" />
            <div className="w-3 h-3 rounded-sm bg-purple-500/50 border border-purple-500/60" />
            <div className="w-3 h-3 rounded-sm bg-purple-600/70 border border-purple-600/80" />
            <div className="w-3 h-3 rounded-sm bg-purple-700/90 border border-purple-700" />
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-1" style={{ minWidth: 'max-content' }}>
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-2">
            <div className="h-3" /> {/* Spacer for month labels */}
            {dayLabels.map((day, idx) => (
              <div
                key={day}
                className="h-3 text-xs text-white/40 flex items-center"
                style={{ visibility: idx % 2 === 0 ? 'visible' : 'hidden' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex flex-col">
            {/* Month labels */}
            <div className="flex gap-1 mb-1 h-3">
              {weeks.map((week, weekIdx) => {
                const firstDay = week[0];
                const showMonth = firstDay && (weekIdx === 0 || firstDay.getDate() <= 7);
                return (
                  <div key={weekIdx} className="w-3 text-xs text-white/40">
                    {showMonth ? monthLabels[firstDay.getMonth()] : ''}
                  </div>
                );
              })}
            </div>

            {/* Days grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((date, dayIdx) => {
                    const level = getActivityLevel(date);
                    const isFuture = date > new Date();
                    if (isFuture) {
                      return <div key={dayIdx} className="w-3 h-3" />;
                    }
                    return (
                      <div
                        key={dayIdx}
                        className={`w-3 h-3 rounded-sm border transition-all cursor-pointer hover:ring-2 hover:ring-purple-400 ${getColorClass(level)}`}
                        title={formatTooltip(date, level)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {heatmapData.length === 0 && (
        <div className="text-center py-8 text-white/40 text-sm">
          No activity yet. Start studying to see your progress!
        </div>
      )}
    </div>
  );
}
