/**
 * Enhanced Flashcard Component with Cluster Badges, Tags, and Visualizations
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Flashcard, ClusterType } from '../lib/database';
import { 
  Brain, Target, Building2, Scale, TrendingUp, Globe,
  BarChart3, Activity, Network, Layers, GitCompare, Lightbulb,
  FileText, Tag as TagIcon, Sparkles
} from 'lucide-react';
import { Badge } from './ui/badge';

interface EnhancedFlashcardProps {
  flashcard: Flashcard;
  index: number;
}

// Cluster configuration
const CLUSTER_CONFIG: Record<ClusterType, { emoji: string; color: string; icon: any }> = {
  'Foundational Concepts': { emoji: '🎯', color: 'from-blue-500 to-cyan-500', icon: Target },
  'Architectural Mechanics': { emoji: '🏗️', color: 'from-purple-500 to-pink-500', icon: Building2 },
  'Comparative Analysis': { emoji: '⚖️', color: 'from-green-500 to-emerald-500', icon: Scale },
  'Performance Metrics': { emoji: '📈', color: 'from-orange-500 to-red-500', icon: TrendingUp },
  'Context & Big Picture': { emoji: '🌍', color: 'from-indigo-500 to-purple-500', icon: Globe },
  'Critical Thinking': { emoji: '🧠', color: 'from-pink-500 to-rose-500', icon: Brain },
};

// Visualization icons
const VISUALIZATION_ICONS = {
  iconography: Sparkles,
  diagram: Network,
  bar_chart: BarChart3,
  heatmap: Activity,
  confusion_matrix: Layers,
  timeline: TrendingUp,
  concept_map: GitCompare,
};

const DIFFICULTY_COLORS = {
  undergrad: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  graduate: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  phd: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

export function EnhancedFlashcard({ flashcard, index }: EnhancedFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);

  const cluster = flashcard.cluster || 'Foundational Concepts';
  const clusterConfig = CLUSTER_CONFIG[cluster];
  const ClusterIcon = clusterConfig.icon;
  const difficultyColor = DIFFICULTY_COLORS[flashcard.difficulty_level || 'graduate'];

  const VisualizationIcon = flashcard.visualization 
    ? VISUALIZATION_ICONS[flashcard.visualization.type] || Lightbulb
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Card Container */}
      <div 
        className="relative h-80 cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front of Card */}
          <div
            className="absolute inset-0 glass-panel rounded-2xl p-6 backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >


            {/* Question */}
            <div className="flex-1 flex items-center justify-center mb-4">
              <p className="text-white text-center">
                {flashcard.front}
              </p>
            </div>

            {/* Visualization Indicator */}
            {flashcard.visualization && VisualizationIcon && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs mb-3">
                <VisualizationIcon className="w-4 h-4" />
                <span>{flashcard.visualization.type.replace('_', ' ')}</span>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-white/40 text-xs">
              Click to flip
            </div>
          </div>

          {/* Back of Card */}
          <div
            className="absolute inset-0 glass-panel-strong rounded-2xl backface-hidden overflow-hidden flex flex-col"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {/* Scrollable Content Area */}
            <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
              {/* Answer */}
              <div className="mb-4">
                <p className="text-white text-sm leading-relaxed">
                  {flashcard.back}
                </p>
              </div>

              {/* Visualization */}
              {flashcard.visualization && (
                <motion.div
                  className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10"
                  initial={false}
                >
                  <div className="flex items-start gap-3">
                    {VisualizationIcon && (
                      <VisualizationIcon className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <p className="text-cyan-400 text-xs mb-1">
                        {flashcard.visualization.caption}
                      </p>
                      <p className="text-white/60 text-xs">
                        {flashcard.visualization.description}
                      </p>
                      {flashcard.visualization.annotations && flashcard.visualization.annotations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {flashcard.visualization.annotations.map((annotation, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-xs">
                              {annotation}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Source */}
              {flashcard.source && (
                <div className="flex items-start gap-2 mb-3 text-xs text-white/50">
                  <FileText className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{flashcard.source}</span>
                </div>
              )}

              {/* Tags */}
              {flashcard.tags && flashcard.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {flashcard.tags.map((tag, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                      <TagIcon className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-white/60">#{tag}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-white/40 text-xs">
                Click to flip back
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
