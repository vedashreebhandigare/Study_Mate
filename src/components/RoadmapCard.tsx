import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Sparkles, AlertCircle, Loader2, Map, TrendingUp } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { GlassButton } from './GlassButton';
import { AdaptiveRoadmapTimeline } from './AdaptiveRoadmapTimeline';
import { ModuleDetailPage } from './ModuleDetailPage';
import {
  generateModularRoadmap,
  updateRoadmapWithProgress,
  AdaptiveRoadmap,
  ModuleProgress,
} from '../lib/adaptive-roadmap-engine';
import {
  getWeakConcepts,
  getStudyPlan,
  saveAdaptiveRoadmap,
  getModuleProgress,
  ConceptMastery,
} from '../lib/database';
import { getStoredDocumentText } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { initializeModuleProgress, getModuleProgress as getModuleProgressService } from '../lib/module-progress-service';
import { toast } from 'sonner@2.0.3';

interface RoadmapCardProps {
  selectedDocumentId: string | null;
  selectedDocumentName: string | null;
}

export function RoadmapCard({ selectedDocumentId, selectedDocumentName }: RoadmapCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [roadmap, setRoadmap] = useState<AdaptiveRoadmap | null>(null);
  const [weakCount, setWeakCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedModule, setSelectedModule] = useState<{
    id: string;
    title: string;
    topics: string[];
  } | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('🗺️ RoadmapCard state:', {
      selectedDocumentId,
      selectedDocumentName,
      hasRoadmap: !!roadmap,
      isGenerating,
      weakCount
    });
  }, [selectedDocumentId, selectedDocumentName, roadmap, isGenerating, weakCount]);

  // Load existing roadmap on mount
  useEffect(() => {
    loadExistingRoadmap();
    loadWeakConcepts();
  }, [selectedDocumentId]);

  const loadExistingRoadmap = async () => {
    if (!selectedDocumentId || selectedDocumentId === 'undefined' || selectedDocumentId === 'null') {
      console.log('⚠️ No valid document ID for roadmap');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: plan } = await getStudyPlan(user.id, selectedDocumentId);
      
      if (plan && plan.plan_type === 'adaptive_modular' && plan.plan_data) {
        // Load module progress
        const { data: progressData } = await getModuleProgress(user.id, selectedDocumentId);
        const { data: concepts } = await getWeakConcepts(user.id, selectedDocumentId);

        // Update roadmap with latest performance data
        const updatedRoadmap = updateRoadmapWithProgress(
          plan.plan_data,
          concepts || [],
          progressData || []
        );

        setRoadmap(updatedRoadmap);
      }
    } catch (error) {
      console.error('Error loading roadmap:', error);
    }
  };

  const loadWeakConcepts = async () => {
    if (!selectedDocumentId || selectedDocumentId === 'undefined' || selectedDocumentId === 'null') {
      console.log('⚠️ No valid document ID for weak concepts');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await getWeakConcepts(user.id, selectedDocumentId);
    setWeakCount(data?.length || 0);
  };

  const handleGenerateRoadmap = async () => {
    console.log('🗺️ Generate Roadmap clicked!', { selectedDocumentId, selectedDocumentName });

    if (!selectedDocumentId || !selectedDocumentName) {
      toast.error('Please select a document first');
      return;
    }

    setIsGenerating(true);
    console.log('🔄 Starting roadmap generation...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get document content
      toast.info('Analyzing document structure...');
      const documentText = await getStoredDocumentText(selectedDocumentId, user.id);
      if (!documentText) {
        toast.error('Could not load document content');
        setIsGenerating(false);
        return;
      }

      // Get existing concept data (if any)
      console.log('📊 Fetching weak concepts for:', { userId: user.id, docId: selectedDocumentId });
      const { data: concepts, error: conceptError } = await getWeakConcepts(user.id, selectedDocumentId);
      console.log('📊 Concept data:', { concepts, conceptError });

      // Generate modular roadmap
      toast.info('Building your personalized learning path...');
      const { roadmap: generatedRoadmap, error } = await generateModularRoadmap(
        selectedDocumentName,
        documentText,
        concepts || undefined
      );

      if (error || !generatedRoadmap) {
        throw new Error('Failed to generate roadmap');
      }

      // Add document ID
      generatedRoadmap.documentId = selectedDocumentId;

      // Initialize module progress tracking
      const modulesForInit = generatedRoadmap.modules.map((module, index) => ({
        id: module.id,
        title: module.title,
        topics: module.concepts,
        order: index,
      }));
      await initializeModuleProgress(user.id, selectedDocumentId, modulesForInit);

      // Initialize with progress data if available
      const { data: progressData } = await getModuleProgress(user.id, selectedDocumentId);
      const updatedRoadmap = updateRoadmapWithProgress(
        generatedRoadmap,
        concepts || [],
        progressData || []
      );

      // Save to database
      await saveAdaptiveRoadmap(user.id, selectedDocumentId, updatedRoadmap);

      setRoadmap(updatedRoadmap);
      setShowRoadmap(true);
      toast.success('Your adaptive learning roadmap is ready! 🎉');
    } catch (error: any) {
      console.error('❌ Error generating roadmap:', error);
      toast.error(error.message || 'Failed to generate roadmap');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedDocumentId || !roadmap) return;

    setIsRefreshing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Reload performance data
      const { data: concepts } = await getWeakConcepts(user.id, selectedDocumentId);
      const { data: progressData } = await getModuleProgress(user.id, selectedDocumentId);

      // Update roadmap with latest data
      const updatedRoadmap = updateRoadmapWithProgress(
        roadmap,
        concepts || [],
        progressData || []
      );

      setRoadmap(updatedRoadmap);
      
      // Save updated roadmap
      await saveAdaptiveRoadmap(user.id, selectedDocumentId, updatedRoadmap);

      toast.success('Roadmap updated with latest performance!');
    } catch (error) {
      console.error('Error refreshing roadmap:', error);
      toast.error('Failed to refresh roadmap');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleModuleClick = (moduleId: string) => {
    const module = roadmap?.modules.find(m => m.id === moduleId);
    if (module) {
      // Open module detail page
      setSelectedModule({
        id: module.id,
        title: module.title,
        topics: module.concepts,
      });
      setShowRoadmap(false);
    }
  };

  const masteredCount = roadmap?.modules.filter(m => m.status === 'mastered').length || 0;
  const totalModules = roadmap?.modules.length || 0;
  const progress = totalModules > 0 ? (masteredCount / totalModules) * 100 : 0;

  return (
    <>
      <DashboardCard
        title="🗺️ Adaptive Learning Path"
        description="AI-powered modular roadmap that adapts to your performance"
        icon={MapPin}
        gradient="from-purple-500 to-pink-500"
      >
        <div className="space-y-4">
          {weakCount > 0 && !roadmap && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
              <div className="flex items-center gap-2 text-yellow-300 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{weakCount} concepts need improvement - Generate a roadmap to master them!</span>
              </div>
            </div>
          )}

          {roadmap && (
            <div className="space-y-3">
              {/* Progress */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm">Overall Progress</span>
                  <span className="text-white">
                    {masteredCount} / {totalModules} modules
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
              </div>

              {/* Module Summary */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2 text-white/70 text-sm">
                  <Map className="w-4 h-4" />
                  <span>Learning Modules</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-green-300">
                    🟢 {roadmap.modules.filter(m => m.status === 'mastered').length} Mastered
                  </div>
                  <div className="text-yellow-300">
                    🟡 {roadmap.modules.filter(m => m.status === 'in-progress').length} In Progress
                  </div>
                  <div className="text-red-300">
                    🔴 {roadmap.modules.filter(m => m.status === 'needs-review').length} Needs Review
                  </div>
                  <div className="text-gray-400">
                    🔒 {roadmap.modules.filter(m => m.status === 'locked').length} Locked
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {roadmap ? (
              <>
                <GlassButton
                  onClick={() => setShowRoadmap(true)}
                  className="flex-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30"
                >
                  <Map className="w-4 h-4 mr-2" />
                  View Roadmap
                </GlassButton>
                <GlassButton
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-white/5 hover:bg-white/10"
                >
                  {isRefreshing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                </GlassButton>
              </>
            ) : (
              <GlassButton
                onClick={handleGenerateRoadmap}
                disabled={isGenerating || !selectedDocumentId}
                className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Learning Path
                  </>
                )}
              </GlassButton>
            )}
          </div>

          {!selectedDocumentId && (
            <p className="text-white/40 text-sm text-center">
              📄 Loading documents... If this persists, try refreshing the page
            </p>
          )}
        </div>
      </DashboardCard>

      {/* Roadmap Modal */}
      {showRoadmap && roadmap && (
        <AdaptiveRoadmapTimeline
          roadmap={roadmap}
          onClose={() => setShowRoadmap(false)}
          onModuleClick={handleModuleClick}
          onRefresh={handleRefresh}
        />
      )}

      {/* Module Detail Page */}
      {selectedModule && selectedDocumentId && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <ModuleDetailPage
            documentId={selectedDocumentId}
            moduleId={selectedModule.id}
            moduleTitle={selectedModule.title}
            moduleTopics={selectedModule.topics}
            onBack={() => {
              setSelectedModule(null);
              setShowRoadmap(true);
            }}
          />
        </div>
      )}
    </>
  );
}
