import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, CheckCircle, Circle, Clock, Brain, 
  MessageSquare, Map, Sparkles, Target, TrendingUp,
  X, Play, ChevronRight
} from 'lucide-react';
import { StudyRoadmap, RoadmapDay } from '../lib/roadmap-generator';
import { GlassButton } from './GlassButton';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface AdaptiveRoadmapProps {
  roadmap: StudyRoadmap;
  completedDays: number[];
  onClose: () => void;
  onDayComplete: (day: number) => void;
  onStartDay: (day: number) => void;
}

export function AdaptiveRoadmap({ 
  roadmap, 
  completedDays, 
  onClose, 
  onDayComplete,
  onStartDay 
}: AdaptiveRoadmapProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const progress = (completedDays.length / roadmap.duration) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-purple-900/80 via-blue-900/80 to-indigo-900/80 backdrop-blur-xl p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-2 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 p-4">
              <Map className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-white mb-2">{roadmap.title}</h2>
              <p className="text-white/60 mb-4">{roadmap.summary}</p>
              
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Your Progress</span>
                  <span className="text-white">
                    {completedDays.length} / {roadmap.duration} days
                  </span>
                </div>
                <Progress value={progress} className="h-2 bg-white/10" />
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Days */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-4">
          {roadmap.roadmap.map((day) => {
            const isCompleted = completedDays.includes(day.day);
            const isExpanded = expandedDay === day.day;
            const isCurrent = !isCompleted && completedDays.length + 1 === day.day;

            return (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: day.day * 0.05 }}
                className={`relative overflow-hidden rounded-2xl border transition-all ${
                  isCompleted 
                    ? 'border-green-500/30 bg-gradient-to-br from-green-900/20 via-emerald-900/20 to-teal-900/20' 
                    : isCurrent
                    ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-900/30 via-amber-900/30 to-orange-900/30 shadow-lg shadow-yellow-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {/* Day Header */}
                <div 
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`flex-shrink-0 mt-1 ${
                      isCompleted ? 'text-green-400' : isCurrent ? 'text-yellow-400' : 'text-white/30'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : isCurrent ? (
                        <Target className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-white">Day {day.day}</h3>
                          {isCurrent && (
                            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                              Current
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                              ✓ Completed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-white/50 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{day.estimatedTime}</span>
                        </div>
                      </div>

                      <p className="text-white/80 mb-3">{day.focus}</p>

                      {/* Concepts Tags */}
                      <div className="flex flex-wrap gap-2">
                        {day.concepts.map((concept, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>

                    <ChevronRight 
                      className={`w-5 h-5 text-white/50 transition-transform flex-shrink-0 mt-1 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-2 space-y-4 border-t border-white/10">
                        {/* Resources */}
                        <div className="space-y-3">
                          <h4 className="text-white/90 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Recommended Resources
                          </h4>

                          {/* Flashcards */}
                          {day.resources.flashcards && day.resources.flashcards.length > 0 && (
                            <div className="rounded-xl bg-white/5 p-4 space-y-2">
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <Brain className="w-4 h-4" />
                                <span>Flashcards</span>
                              </div>
                              <ul className="space-y-1 text-white/80">
                                {day.resources.flashcards.map((card, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-purple-400">•</span>
                                    <span>{card}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Quizzes */}
                          {day.resources.quizzes && day.resources.quizzes.length > 0 && (
                            <div className="rounded-xl bg-white/5 p-4 space-y-2">
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <Target className="w-4 h-4" />
                                <span>Quizzes</span>
                              </div>
                              <ul className="space-y-1 text-white/80">
                                {day.resources.quizzes.map((quiz, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-blue-400">•</span>
                                    <span>{quiz}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Concept Map */}
                          {day.resources.conceptMap && (
                            <div className="rounded-xl bg-white/5 p-4 space-y-2">
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <Map className="w-4 h-4" />
                                <span>Concept Map</span>
                              </div>
                              <p className="text-white/80">{day.resources.conceptMap}</p>
                            </div>
                          )}

                          {/* AI Tutor Questions */}
                          {day.resources.aiTutorQuestions && day.resources.aiTutorQuestions.length > 0 && (
                            <div className="rounded-xl bg-white/5 p-4 space-y-2">
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <MessageSquare className="w-4 h-4" />
                                <span>Ask AI Tutor</span>
                              </div>
                              <ul className="space-y-1 text-white/80">
                                {day.resources.aiTutorQuestions.map((question, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-400">•</span>
                                    <span>{question}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Checkpoint */}
                        <div className="rounded-xl bg-gradient-to-br from-yellow-900/30 via-amber-900/30 to-orange-900/30 border border-yellow-500/30 p-4">
                          <div className="flex items-center gap-2 mb-2 text-yellow-300">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm">Checkpoint</span>
                          </div>
                          <p className="text-white/90">{day.checkpoint}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                          {!isCompleted && (
                            <GlassButton
                              onClick={() => onStartDay(day.day)}
                              className="flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start Day {day.day}
                            </GlassButton>
                          )}
                          
                          {!isCompleted && (
                            <GlassButton
                              onClick={() => onDayComplete(day.day)}
                              className="flex-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark Complete
                            </GlassButton>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-white/10 bg-gradient-to-r from-purple-900/80 via-blue-900/80 to-indigo-900/80 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Generated {new Date(roadmap.generatedAt).toLocaleDateString()}</span>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
