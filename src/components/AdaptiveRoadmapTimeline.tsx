import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle, Lock, AlertCircle, Play, ChevronDown,
  Clock, Brain, BookOpen, MessageSquare, Map, Target,
  TrendingUp, Sparkles, X
} from 'lucide-react';
import { AdaptiveRoadmap, LearningModule, ModuleStatus, getStatusColor, getNextAction } from '../lib/adaptive-roadmap-engine';
import { GlassButton } from './GlassButton';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface AdaptiveRoadmapTimelineProps {
  roadmap: AdaptiveRoadmap;
  onClose: () => void;
  onModuleClick: (moduleId: string) => void;
  onRefresh: () => void;
}

export function AdaptiveRoadmapTimeline({
  roadmap,
  onClose,
  onModuleClick,
  onRefresh
}: AdaptiveRoadmapTimelineProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const nextAction = getNextAction(roadmap);
  const totalModules = roadmap.modules.length;
  const masteredCount = roadmap.modules.filter(m => m.status === 'mastered').length;
  const progress = (masteredCount / totalModules) * 100;

  const getStatusIcon = (status: ModuleStatus) => {
    switch (status) {
      case 'mastered':
        return <CheckCircle className="w-6 h-6" />;
      case 'in-progress':
        return <Play className="w-6 h-6" />;
      case 'needs-review':
        return <AlertCircle className="w-6 h-6" />;
      case 'available':
        return <Target className="w-6 h-6" />;
      case 'locked':
        return <Lock className="w-6 h-6" />;
    }
  };

  const getStatusLabel = (status: ModuleStatus) => {
    switch (status) {
      case 'mastered':
        return '✓ Mastered';
      case 'in-progress':
        return 'In Progress';
      case 'needs-review':
        return 'Needs Review';
      case 'available':
        return 'Available';
      case 'locked':
        return 'Locked';
    }
  };

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

              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Overall Mastery</span>
                  <span className="text-white">
                    {masteredCount} / {totalModules} modules
                  </span>
                </div>
                <Progress value={progress} className="h-2 bg-white/10" />
              </div>

              {/* Next Action Badge */}
              {nextAction.action !== 'complete' && (
                <div className="mt-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 p-3">
                  <div className="flex items-center gap-2 text-yellow-300 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>{nextAction.message}</span>
                  </div>
                </div>
              )}

              {nextAction.action === 'complete' && (
                <div className="mt-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 p-3">
                  <div className="flex items-center gap-2 text-green-300 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>{nextAction.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto max-h-[calc(90vh-250px)] p-6">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-blue-500/50 to-indigo-500/50" />

            {/* Modules */}
            <div className="space-y-6">
              {roadmap.modules.map((module, index) => {
                const isExpanded = expandedModule === module.id;
                const colors = getStatusColor(module.status!);
                const isCurrent = nextAction.moduleId === module.id;

                return (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {/* Timeline node */}
                    <div className={`absolute left-8 -translate-x-1/2 w-6 h-6 rounded-full border-2 ${colors.border} ${module.status === 'locked' ? 'bg-gray-800' : 'bg-gradient-to-br ' + colors.bg} flex items-center justify-center text-xs z-10`}>
                      {module.status === 'mastered' && '✓'}
                      {module.status === 'locked' && '🔒'}
                    </div>

                    {/* Module Card */}
                    <div className={`ml-20 rounded-2xl border transition-all ${colors.border} ${isCurrent ? 'shadow-lg shadow-yellow-500/20' : ''} ${module.status === 'locked' ? 'opacity-60' : ''}`}>
                      {/* Module Header */}
                      <div
                        className={`p-5 cursor-pointer bg-gradient-to-br ${colors.bg} backdrop-blur-sm`}
                        onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={colors.text}>
                                {getStatusIcon(module.status!)}
                              </div>
                              <h3 className="text-white">{module.title}</h3>
                            </div>

                            <p className="text-white/70 mb-3">{module.description}</p>

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={`${colors.bg} ${colors.text} border ${colors.border}`}
                              >
                                {getStatusLabel(module.status!)}
                              </Badge>

                              <Badge className="bg-white/5 text-white/70 border-white/10">
                                {module.difficulty}
                              </Badge>

                              <div className="flex items-center gap-1 text-white/50 text-sm">
                                <Clock className="w-3 h-3" />
                                <span>{module.estimatedTime}</span>
                              </div>

                              {module.masteryScore !== undefined && module.masteryScore > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                        {module.masteryScore}% mastery
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Based on quiz and flashcard performance</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              {isCurrent && (
                                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 animate-pulse">
                                  ⭐ Recommended Next
                                </Badge>
                              )}
                            </div>
                          </div>

                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-5 h-5 text-white/50" />
                          </motion.div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-5 pt-0 space-y-4">
                              {/* Concepts */}
                              <div>
                                <h4 className="text-white/90 mb-2 flex items-center gap-2">
                                  <Brain className="w-4 h-4" />
                                  Key Concepts
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {module.concepts.map((concept, i) => (
                                    <span
                                      key={i}
                                      className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm"
                                    >
                                      {concept}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Resources */}
                              <div className="space-y-3">
                                <h4 className="text-white/90 flex items-center gap-2">
                                  <BookOpen className="w-4 h-4" />
                                  Learning Resources
                                </h4>

                                {/* Flashcards */}
                                {module.resources.flashcardTopics.length > 0 && (
                                  <div className="rounded-xl bg-white/5 p-3">
                                    <div className="text-sm text-white/70 mb-2">📚 Flashcards</div>
                                    <ul className="space-y-1 text-white/80 text-sm">
                                      {module.resources.flashcardTopics.map((topic, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <span className="text-purple-400 mt-1">•</span>
                                          <span>{topic}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Quizzes */}
                                {module.resources.quizTopics.length > 0 && (
                                  <div className="rounded-xl bg-white/5 p-3">
                                    <div className="text-sm text-white/70 mb-2">🎯 Quizzes</div>
                                    <ul className="space-y-1 text-white/80 text-sm">
                                      {module.resources.quizTopics.map((topic, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <span className="text-blue-400 mt-1">•</span>
                                          <span>{topic}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* AI Tutor */}
                                {module.resources.tutorQuestions.length > 0 && (
                                  <div className="rounded-xl bg-white/5 p-3">
                                    <div className="text-sm text-white/70 mb-2">💬 Ask AI Tutor</div>
                                    <ul className="space-y-1 text-white/80 text-sm">
                                      {module.resources.tutorQuestions.map((q, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <span className="text-green-400 mt-1">•</span>
                                          <span>{q}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Checkpoints */}
                              <div className="rounded-xl bg-gradient-to-br from-yellow-900/30 via-amber-900/30 to-orange-900/30 border border-yellow-500/30 p-4">
                                <div className="flex items-center gap-2 mb-2 text-yellow-300">
                                  <Target className="w-4 h-4" />
                                  <span className="text-sm">Mastery Checkpoints</span>
                                </div>
                                <ul className="space-y-1 text-white/90 text-sm">
                                  {module.checkpoints.map((checkpoint, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-yellow-400 mt-1">✓</span>
                                      <span>{checkpoint}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Prerequisites */}
                              {module.prerequisiteIds.length > 0 && (
                                <div className="text-sm text-white/60">
                                  <span className="text-white/40">Prerequisites:</span>{' '}
                                  {module.prerequisiteIds
                                    .map(id => roadmap.modules.find(m => m.id === id)?.title)
                                    .filter(Boolean)
                                    .join(', ')}
                                </div>
                              )}

                              {/* Action Button */}
                              {module.status !== 'locked' && (
                                <GlassButton
                                  onClick={() => onModuleClick(module.id)}
                                  className={`w-full ${
                                    module.status === 'needs-review'
                                      ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30'
                                      : module.status === 'mastered'
                                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30'
                                      : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30'
                                  }`}
                                >
                                  {module.status === 'needs-review' && (
                                    <>
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      Review Module
                                    </>
                                  )}
                                  {module.status === 'in-progress' && (
                                    <>
                                      <Play className="w-4 h-4 mr-2" />
                                      Continue Learning
                                    </>
                                  )}
                                  {module.status === 'available' && (
                                    <>
                                      <Play className="w-4 h-4 mr-2" />
                                      Start Module
                                    </>
                                  )}
                                  {module.status === 'mastered' && (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Review (Optional)
                                    </>
                                  )}
                                </GlassButton>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-white/10 bg-gradient-to-r from-purple-900/80 via-blue-900/80 to-indigo-900/80 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>{roadmap.totalEstimatedTime} total</span>
              </div>
              <div className="text-white/40">•</div>
              <span>Updated {new Date(roadmap.lastUpdated).toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                className="text-white/80 hover:text-white transition-colors px-3 py-1 rounded-full hover:bg-white/10"
              >
                🔄 Refresh
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors px-3 py-1 rounded-full hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
