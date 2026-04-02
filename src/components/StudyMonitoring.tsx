import { useEffect, useRef, useState } from 'react';

interface SessionEvent {
  time: string;
  type: 'quiz' | 'flashcard' | 'tutor' | 'document' | 'roadmap';
  message: string;
}

const TYPE_COLORS: Record<SessionEvent['type'], string> = {
  quiz: '#6366f1',
  flashcard: '#10b981',
  tutor: '#f59e0b',
  document: '#3b82f6',
  roadmap: '#ec4899',
};

const TYPE_LABELS: Record<SessionEvent['type'], string> = {
  quiz: 'Quiz',
  flashcard: 'Flashcard',
  tutor: 'AI Tutor',
  document: 'Document',
  roadmap: 'Roadmap',
};

// Global event bus so other components can push events here
export const studyMonitorBus = {
  listeners: [] as ((event: SessionEvent) => void)[],
  emit(event: Omit<SessionEvent, 'time'>) {
    const full: SessionEvent = {
      ...event,
      time: new Date().toLocaleTimeString(),
    };
    this.listeners.forEach(fn => fn(full));
  },
  subscribe(fn: (event: SessionEvent) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  },
};

export default function StudyMonitoring() {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = studyMonitorBus.subscribe(event => {
      if (!isLive) return;
      setEvents(prev => [event, ...prev].slice(0, 100));
    });
    return unsub;
  }, [isLive]);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events]);

  return (
    <div style={{
      background: 'rgba(15,15,30,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: 20,
      minHeight: 300,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: isLive ? '#10b981' : '#6b7280',
            display: 'inline-block',
            boxShadow: isLive ? '0 0 6px #10b981' : 'none',
          }} />
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15 }}>
            Live Activity Feed
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIsLive(v => !v)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: isLive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
              color: isLive ? '#10b981' : '#9ca3af',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={() => setEvents([])}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: 400,
        }}
      >
        {events.length === 0 ? (
          <div style={{
            color: '#4b5563',
            textAlign: 'center',
            padding: '40px 0',
            fontSize: 14,
          }}>
            No activity yet. Start using quizzes, flashcards, or the AI tutor to see live events here.
          </div>
        ) : (
          events.map((ev, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                borderLeft: `3px solid ${TYPE_COLORS[ev.type]}`,
                animation: i === 0 ? 'fadeIn 0.3s ease' : undefined,
              }}
            >
              <span style={{
                fontSize: 11,
                color: '#6b7280',
                whiteSpace: 'nowrap',
                marginTop: 1,
                minWidth: 60,
              }}>
                {ev.time}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: TYPE_COLORS[ev.type],
                whiteSpace: 'nowrap',
                minWidth: 64,
              }}>
                {TYPE_LABELS[ev.type]}
              </span>
              <span style={{ fontSize: 13, color: '#cbd5e1' }}>
                {ev.message}
              </span>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
