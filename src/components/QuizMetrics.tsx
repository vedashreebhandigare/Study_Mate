/**
 * Quiz Metrics Display
 * Shows enhanced generation metrics and quality indicators
 */

import { motion } from 'motion/react';
import { QuizGenerationResult } from '../lib/quiz-generator-advanced';
import { Brain, Target, Clock, Award, BarChart3, CheckCircle2, Sparkles } from 'lucide-react';

interface QuizMetricsProps {
  result: QuizGenerationResult;
}

export function QuizMetrics({ result }: QuizMetricsProps) {
  const { metadata, validation, questions, contentAnalysis } = result;

  // Calculate quality metrics
  const qualityColor = validation.score >= 90 
    ? 'from-green-500 to-emerald-500'
    : validation.score >= 75
    ? 'from-blue-500 to-cyan-500'
    : 'from-yellow-500 to-orange-500';

  const qualityLabel = validation.score >= 90
    ? 'Excellent'
    : validation.score >= 75
    ? 'Good'
    : 'Fair';

  // Calculate average explanation length
  const avgExplanationLength = Math.round(
    questions.reduce((sum, q) => sum + q.explanation.length, 0) / questions.length
  );

  // Format generation time
  const generationTime = (metadata.generationTime / 1000).toFixed(1);

  // Get difficulty distribution percentages
  const total = questions.length;
  const easyPct = Math.round((metadata.difficultyDistribution.easy / total) * 100);
  const mediumPct = Math.round((metadata.difficultyDistribution.medium / total) * 100);
  const hardPct = Math.round((metadata.difficultyDistribution.hard / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-3xl p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${qualityColor} flex items-center justify-center`}>
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl text-white">Quiz Generation Metrics</h3>
          <p className="text-white/60 text-sm">Enhanced quality indicators</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Quality Score */}
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-400" />
            <p className="text-white/60 text-sm">Quality Score</p>
          </div>
          <p className="text-2xl text-white">{validation.score}%</p>
          <p className={`text-xs bg-gradient-to-r ${qualityColor} bg-clip-text text-transparent font-medium`}>
            {qualityLabel}
          </p>
        </div>

        {/* Cognitive Quality (NEW) */}
        <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <p className="text-white/60 text-sm">Cognitive</p>
          </div>
          <p className="text-2xl text-white">{metadata.cognitiveQuality}%</p>
          <p className="text-xs text-cyan-400">
            Bloom's Taxonomy
          </p>
        </div>

        {/* Generation Time */}
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <p className="text-white/60 text-sm">Gen Time</p>
          </div>
          <p className="text-2xl text-white">{generationTime}s</p>
          <p className="text-xs text-white/40">
            {metadata.attempts} attempt{metadata.attempts > 1 ? 's' : ''}
          </p>
        </div>

        {/* Content Coverage */}
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-400" />
            <p className="text-white/60 text-sm">Coverage</p>
          </div>
          <p className="text-2xl text-white">{contentAnalysis.wordCount.toLocaleString()}</p>
          <p className="text-xs text-white/40">words analyzed</p>
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <p className="text-white text-sm">Difficulty Distribution</p>
        </div>

        <div className="space-y-3">
          {/* Easy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-sm">Easy</span>
              <span className="text-white text-sm">
                {metadata.difficultyDistribution.easy} ({easyPct}%)
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${easyPct}%` }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            </div>
          </div>

          {/* Medium */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-sm">Medium</span>
              <span className="text-white text-sm">
                {metadata.difficultyDistribution.medium} ({mediumPct}%)
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${mediumPct}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
          </div>

          {/* Hard */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-sm">Hard</span>
              <span className="text-white text-sm">
                {metadata.difficultyDistribution.hard} ({hardPct}%)
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                initial={{ width: 0 }}
                animate={{ width: `${hardPct}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="text-center p-3 rounded-xl bg-white/5">
          <p className="text-white/60 text-xs mb-1">Question Quality</p>
          <p className="text-white text-lg">{validation.metrics.questionQuality}%</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/5">
          <p className="text-white/60 text-xs mb-1">Options Quality</p>
          <p className="text-white text-lg">{validation.metrics.optionsQuality}%</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/5">
          <p className="text-white/60 text-xs mb-1">Explanation Quality</p>
          <p className="text-white text-lg">{validation.metrics.explanationQuality}%</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/5">
          <p className="text-white/60 text-xs mb-1">Diversity Score</p>
          <p className="text-white text-lg">{validation.metrics.diversityScore}%</p>
        </div>
      </div>

      {/* Warnings (if any) */}
      {validation.warnings.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-400 text-sm mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Quality Suggestions ({validation.warnings.length})
          </p>
          <div className="space-y-1">
            {validation.warnings.slice(0, 3).map((warning, i) => (
              <p key={i} className="text-yellow-300/60 text-xs">• {warning}</p>
            ))}
            {validation.warnings.length > 3 && (
              <p className="text-yellow-300/40 text-xs">+ {validation.warnings.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Generation Config Info */}
      <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <p className="text-purple-300 text-xs mb-1">
          🎯 Generated with <span className="font-medium">{metadata.difficulty}</span> level parameters
        </p>
        <p className="text-purple-200/60 text-xs">
          Temperature optimized • Distribution balanced • Quality validated
        </p>
      </div>
    </motion.div>
  );
}
