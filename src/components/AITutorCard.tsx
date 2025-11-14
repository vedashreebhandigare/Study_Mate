import { useState, useEffect } from 'react';
import { DashboardCard } from './DashboardCard';
import { AITutor } from './AITutor';
import { Brain, MessageCircle, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { getUserTutorChats, type TutorChat } from '../lib/database';

interface AITutorCardProps {
  userId: string;
}

export function AITutorCard({ userId }: AITutorCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [recentChats, setRecentChats] = useState<TutorChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadStats = async () => {
    setIsLoading(true);
    const { data } = await getUserTutorChats(userId, 3);
    if (data) {
      setChatCount(data.length);
      setRecentChats(data.slice(0, 3));
    }
    setIsLoading(false);
  };

  return (
    <>
      <DashboardCard
        title="AI Tutor"
        description="Chat with your AI learning assistant"
        icon={Brain}
        gradient="from-purple-500/20 to-blue-500/20"
        onClick={() => setIsOpen(true)}
      >
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20"
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-300/70">Conversations</span>
              </div>
              <p className="text-2xl text-white">{chatCount}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20"
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-300/70">Learning Time</span>
              </div>
              <p className="text-2xl text-white">{Math.floor(chatCount * 2.5)}m</p>
            </motion.div>
          </div>

          {/* Recent Chats Preview */}
          {recentChats.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-purple-300/70 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Recent Questions
              </p>
              <div className="space-y-2">
                {recentChats.map((chat, idx) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3 rounded-lg bg-slate-900/30 border border-purple-500/10 hover:border-purple-500/30 transition-all"
                  >
                    <p className="text-sm text-purple-200 line-clamp-1">
                      {chat.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-purple-300/50">
                        {chat.mode === 'focused' ? '📚 Focused' : '💬 General'}
                      </span>
                      {chat.document_name && (
                        <span className="text-xs text-purple-300/50 truncate">
                          • {chat.document_name}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <Brain className="w-12 h-12 text-purple-400/30 mx-auto mb-3" />
              <p className="text-sm text-purple-300/70">
                Start a conversation with your AI tutor
              </p>
              <p className="text-xs text-purple-300/50 mt-1">
                Ask questions about your documents or get help with concepts
              </p>
            </div>
          )}

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white transition-all flex items-center justify-center gap-2"
          >
            <Brain className="w-4 h-4" />
            {chatCount > 0 ? 'Continue Learning' : 'Start Chat'}
          </motion.button>
        </div>
      </DashboardCard>

      <AITutor 
        isOpen={isOpen} 
        onClose={() => {
          setIsOpen(false);
          loadStats(); // Reload stats when closing
        }} 
        userId={userId} 
      />
    </>
  );
}
