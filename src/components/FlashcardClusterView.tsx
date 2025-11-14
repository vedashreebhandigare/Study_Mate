/**
 * Flashcard Cluster View - Displays flashcards grouped by cognitive clusters
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Flashcard, ClusterType } from '../lib/database';
import { EnhancedFlashcard } from './EnhancedFlashcard';
import { 
  Brain, Target, Building2, Scale, TrendingUp, Globe,
  Filter, Sparkles
} from 'lucide-react';
import { Badge } from './ui/badge';

interface FlashcardClusterViewProps {
  flashcards: Flashcard[];
}

const CLUSTER_ORDER: ClusterType[] = [
  'Foundational Concepts',
  'Architectural Mechanics',
  'Comparative Analysis',
  'Performance Metrics',
  'Context & Big Picture',
  'Critical Thinking',
];

const CLUSTER_CONFIG: Record<ClusterType, { emoji: string; color: string; icon: any; description: string }> = {
  'Foundational Concepts': { 
    emoji: '🎯', 
    color: 'from-blue-500 to-cyan-500', 
    icon: Target,
    description: 'Terms, datasets, components, basic definitions'
  },
  'Architectural Mechanics': { 
    emoji: '🏗️', 
    color: 'from-purple-500 to-pink-500', 
    icon: Building2,
    description: 'How models work, layer functions, data flow'
  },
  'Comparative Analysis': { 
    emoji: '⚖️', 
    color: 'from-green-500 to-emerald-500', 
    icon: Scale,
    description: 'Model/dataset comparisons, trade-offs'
  },
  'Performance Metrics': { 
    emoji: '📈', 
    color: 'from-orange-500 to-red-500', 
    icon: TrendingUp,
    description: 'Results interpretation, metrics analysis'
  },
  'Context & Big Picture': { 
    emoji: '🌍', 
    color: 'from-indigo-500 to-purple-500', 
    icon: Globe,
    description: 'Motivation, impact, future work'
  },
  'Critical Thinking': { 
    emoji: '🧠', 
    color: 'from-pink-500 to-rose-500', 
    icon: Brain,
    description: 'Critique assumptions, limitations, implications'
  },
};

export function FlashcardClusterView({ flashcards }: FlashcardClusterViewProps) {
  const [selectedCluster, setSelectedCluster] = useState<ClusterType | 'all'>('all');

  // Group flashcards by cluster
  const groupedFlashcards = useMemo(() => {
    const groups: Partial<Record<ClusterType, Flashcard[]>> = {};
    
    flashcards.forEach(card => {
      const cluster = card.cluster || 'Foundational Concepts';
      if (!groups[cluster]) {
        groups[cluster] = [];
      }
      groups[cluster]!.push(card);
    });

    return groups;
  }, [flashcards]);

  // Filter flashcards based on selected cluster
  const filteredFlashcards = useMemo(() => {
    if (selectedCluster === 'all') {
      return flashcards;
    }
    return flashcards.filter(card => card.cluster === selectedCluster);
  }, [flashcards, selectedCluster]);

  // Calculate cluster counts
  const clusterCounts = useMemo(() => {
    const counts: Partial<Record<ClusterType, number>> = {};
    flashcards.forEach(card => {
      const cluster = card.cluster || 'Foundational Concepts';
      counts[cluster] = (counts[cluster] || 0) + 1;
    });
    return counts;
  }, [flashcards]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-3xl text-white">Cognitive Flashcards</h2>
            <p className="text-white/60">
              {flashcards.length} cards across 6 cognitive clusters
            </p>
          </div>
        </div>

        {/* Cluster Filter */}
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-white/80">Filter by Cluster</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* All Button */}
            <button
              onClick={() => setSelectedCluster('all')}
              className={`px-4 py-2 rounded-xl transition-all ${
                selectedCluster === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'glass-panel text-white/60 hover:text-white'
              }`}
            >
              All ({flashcards.length})
            </button>

            {/* Cluster Buttons */}
            {CLUSTER_ORDER.map(cluster => {
              const config = CLUSTER_CONFIG[cluster];
              const count = clusterCounts[cluster] || 0;
              const Icon = config.icon;

              if (count === 0) return null;

              return (
                <button
                  key={cluster}
                  onClick={() => setSelectedCluster(cluster)}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                    selectedCluster === cluster
                      ? `bg-gradient-to-r ${config.color} text-white`
                      : 'glass-panel text-white/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">
                    {config.emoji} {cluster.split(' ')[0]} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flashcards Grid */}
      {selectedCluster === 'all' ? (
        // Show all clusters grouped
        <div className="space-y-12">
          {CLUSTER_ORDER.map(cluster => {
            const cards = groupedFlashcards[cluster];
            if (!cards || cards.length === 0) return null;

            const config = CLUSTER_CONFIG[cluster];
            const Icon = config.icon;

            return (
              <motion.div
                key={cluster}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Cluster Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${config.color} bg-opacity-20 border border-white/10`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl text-white">
                      {config.emoji} {cluster}
                    </h3>
                    <p className="text-white/60 text-sm">
                      {config.description} • {cards.length} card{cards.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cards.map((card, index) => (
                    <EnhancedFlashcard key={card.id} flashcard={card} index={index} />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        // Show selected cluster only
        <div>
          {selectedCluster !== 'all' && (
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${CLUSTER_CONFIG[selectedCluster].color} bg-opacity-20 border border-white/10`}>
                {(() => {
                  const Icon = CLUSTER_CONFIG[selectedCluster].icon;
                  return <Icon className="w-6 h-6 text-white" />;
                })()}
              </div>
              <div>
                <h3 className="text-2xl text-white">
                  {CLUSTER_CONFIG[selectedCluster].emoji} {selectedCluster}
                </h3>
                <p className="text-white/60 text-sm">
                  {CLUSTER_CONFIG[selectedCluster].description}
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFlashcards.map((card, index) => (
              <EnhancedFlashcard key={card.id} flashcard={card} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredFlashcards.length === 0 && (
        <div className="text-center py-20">
          <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl text-white/60 mb-2">No flashcards yet</h3>
          <p className="text-white/40">
            Generate flashcards from a document to get started
          </p>
        </div>
      )}
    </div>
  );
}
