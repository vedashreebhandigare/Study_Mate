import { generateWithGemini } from './gemini';
import { ConceptMastery } from './database';
import { parseJSONResponse } from './json-parser-robust';

// 🎯 Module-Based Roadmap Structure
export interface LearningModule {
  id: string;
  title: string;
  description: string;
  concepts: string[];
  prerequisiteIds: string[]; // IDs of modules that must be completed first
  difficulty: 'foundation' | 'core' | 'advanced' | 'expert';
  estimatedTime: string; // e.g., "2-3 hours"
  resources: {
    flashcardTopics: string[];
    quizTopics: string[];
    conceptMapNodes: string[];
    tutorQuestions: string[];
  };
  checkpoints: string[]; // Questions to verify mastery
  status?: ModuleStatus; // Runtime status (calculated)
  masteryScore?: number; // 0-100
}

export type ModuleStatus = 'locked' | 'available' | 'in-progress' | 'needs-review' | 'mastered';

export interface AdaptiveRoadmap {
  id: string;
  title: string;
  documentName: string;
  documentId: string;
  modules: LearningModule[];
  summary: string;
  totalEstimatedTime: string;
  generatedAt: string;
  lastUpdated: string;
}

export interface ModuleProgress {
  moduleId: string;
  status: ModuleStatus;
  masteryScore: number;
  quizAttempts: number;
  quizAverageScore: number;
  flashcardReviews: number;
  flashcardRetention: number;
  tutorQuestionsAsked: number;
  lastActivityAt?: string;
  completedAt?: string;
}

/**
 * 🧠 Generate modular adaptive roadmap from document
 */
export async function generateModularRoadmap(
  documentName: string,
  documentContent: string,
  existingConcepts?: ConceptMastery[]
): Promise<{ roadmap: AdaptiveRoadmap | null; error: any }> {
  try {
    console.log('🗺️ Generating modular roadmap for:', documentName);

    // Prepare context about existing performance
    const performanceContext = existingConcepts && existingConcepts.length > 0
      ? `\n\nEXISTING PERFORMANCE DATA:\n${existingConcepts
          .map(c => `- ${c.concept_name}: ${(c.mastery_score * 100).toFixed(0)}% mastery, ${c.total_attempts} attempts`)
          .join('\n')}`
      : '\n\nNo prior performance data available. Create a foundational learning path.';

    const prompt = `You are an expert educational AI designing adaptive learning curricula.

TASK: Analyze this document and create a modular learning roadmap with 3-5 progressive modules.

DOCUMENT: "${documentName}"
CONTENT (first 4000 chars):
${documentContent.substring(0, 4000)}
${performanceContext}

REQUIREMENTS:
1. Extract 3-5 MODULES that build on each other (foundation → advanced)
2. Each module should:
   - Cover related concepts that naturally group together
   - Have clear prerequisites (which modules must be completed first)
   - Include specific, actionable resources
   - Have checkpoints to verify understanding
3. Module difficulties: foundation (basics everyone needs) → core (main content) → advanced (deeper insights) → expert (cutting-edge/research)
4. Be specific to THIS document - no generic advice
5. Identify actual topics/concepts mentioned in the document

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "title": "Mastering [Main Document Topic]",
  "documentName": "${documentName}",
  "modules": [
    {
      "id": "module-1",
      "title": "Foundations: [Specific Topic]",
      "description": "Build understanding of fundamental concepts needed for this document",
      "concepts": ["Concept A", "Concept B", "Concept C"],
      "prerequisiteIds": [],
      "difficulty": "foundation",
      "estimatedTime": "1-2 hours",
      "resources": {
        "flashcardTopics": ["Topic 1 flashcards", "Topic 2 definitions"],
        "quizTopics": ["Quiz on Topic 1", "Practice: Topic 2"],
        "conceptMapNodes": ["Node A", "Node B relationship"],
        "tutorQuestions": ["Why is X important?", "Explain Y in simple terms"]
      },
      "checkpoints": ["Can you explain X without looking?", "What's the difference between Y and Z?"]
    },
    {
      "id": "module-2",
      "title": "Core: [Main Document Content]",
      "description": "Master the central concepts presented in this document",
      "concepts": ["Main Concept 1", "Main Concept 2"],
      "prerequisiteIds": ["module-1"],
      "difficulty": "core",
      "estimatedTime": "2-3 hours",
      "resources": {
        "flashcardTopics": ["Advanced Topic 1", "Topic 2 applications"],
        "quizTopics": ["Topic 1 deep dive", "Topic 2 scenarios"],
        "conceptMapNodes": ["Central node", "Key relationships"],
        "tutorQuestions": ["How does X relate to Y?", "When would you use Z?"]
      },
      "checkpoints": ["Explain the main argument/findings", "Apply concept X to scenario Y"]
    },
    {
      "id": "module-3",
      "title": "Advanced: [Deeper Insights]",
      "description": "Explore advanced implications and connections",
      "concepts": ["Advanced Concept 1", "Research Direction 1"],
      "prerequisiteIds": ["module-2"],
      "difficulty": "advanced",
      "estimatedTime": "2-4 hours",
      "resources": {
        "flashcardTopics": ["Complex scenarios", "Edge cases"],
        "quizTopics": ["Advanced applications", "Critical thinking quiz"],
        "conceptMapNodes": ["Advanced connections", "Future directions"],
        "tutorQuestions": ["What are the limitations of X?", "How could Y be improved?"]
      },
      "checkpoints": ["Critique the approach taken", "Propose alternative solutions"]
    }
  ],
  "summary": "A progressive learning path through [document topic], starting with foundations and building to advanced mastery.",
  "totalEstimatedTime": "5-9 hours",
  "generatedAt": "${new Date().toISOString()}"
}

CRITICAL RULES:
- Return ONLY valid JSON (no markdown, no \`\`\`json)
- Module IDs must be unique (module-1, module-2, etc.)
- Prerequisites must reference valid module IDs
- First module should have empty prerequisiteIds array
- Be SPECIFIC to the document content - extract real concepts mentioned
- Each module should have 2-5 concepts
- Include at least 3 modules, max 5 modules
- Estimated times should be realistic
`;

    const text = await generateWithGemini(prompt, {
      temperature: 0.7,
      maxOutputTokens: 8000,
    });

    const parsed = parseJSONResponse(text);

    if (!parsed || !parsed.modules || !Array.isArray(parsed.modules)) {
      throw new Error('Invalid roadmap structure from AI');
    }

    // Add metadata
    const roadmap: AdaptiveRoadmap = {
      id: `roadmap-${Date.now()}`,
      documentId: '', // Set by caller
      title: parsed.title,
      documentName: parsed.documentName || documentName,
      modules: parsed.modules,
      summary: parsed.summary,
      totalEstimatedTime: parsed.totalEstimatedTime,
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    console.log(`✅ Generated roadmap with ${roadmap.modules.length} modules`);
    return { roadmap, error: null };
  } catch (error: any) {
    console.error('❌ Error generating modular roadmap:', error);
    return { roadmap: null, error };
  }
}

/**
 * 📊 Calculate module status based on performance data
 */
export function calculateModuleStatus(
  module: LearningModule,
  progress: ModuleProgress,
  allModules: LearningModule[],
  allProgress: Map<string, ModuleProgress>
): ModuleStatus {
  // Check if prerequisites are met
  const prerequisitesMet = module.prerequisiteIds.every(prereqId => {
    const prereqProgress = allProgress.get(prereqId);
    return prereqProgress && (prereqProgress.status === 'mastered');
  });

  if (!prerequisitesMet) {
    return 'locked';
  }

  // Calculate mastery
  const masteryScore = progress.masteryScore;

  if (masteryScore >= 85 && progress.flashcardReviews >= 3 && progress.quizAttempts >= 1) {
    return 'mastered';
  }

  if (masteryScore < 70 && (progress.quizAttempts > 0 || progress.flashcardReviews > 0)) {
    return 'needs-review';
  }

  if (progress.quizAttempts > 0 || progress.flashcardReviews > 0) {
    return 'in-progress';
  }

  return 'available';
}

/**
 * 🎯 Calculate mastery score for a module based on its concepts
 */
export function calculateModuleMastery(
  module: LearningModule,
  conceptMasteries: ConceptMastery[]
): number {
  // Find mastery scores for concepts in this module
  const relevantMasteries = conceptMasteries.filter(cm =>
    module.concepts.some(concept =>
      cm.concept_name.toLowerCase().includes(concept.toLowerCase()) ||
      concept.toLowerCase().includes(cm.concept_name.toLowerCase())
    )
  );

  if (relevantMasteries.length === 0) {
    return 0;
  }

  const avgMastery = relevantMasteries.reduce((sum, cm) => sum + cm.mastery_score, 0) / relevantMasteries.length;
  return Math.round(avgMastery * 100); // Convert to 0-100 scale
}

/**
 * 🔄 Update roadmap with real-time performance data
 */
export function updateRoadmapWithProgress(
  roadmap: AdaptiveRoadmap,
  conceptMasteries: ConceptMastery[],
  moduleProgressData: ModuleProgress[]
): AdaptiveRoadmap {
  const progressMap = new Map<string, ModuleProgress>();
  moduleProgressData.forEach(mp => progressMap.set(mp.moduleId, mp));

  // Calculate status and mastery for each module
  const updatedModules = roadmap.modules.map(module => {
    const progress = progressMap.get(module.id) || {
      moduleId: module.id,
      status: 'locked' as ModuleStatus,
      masteryScore: 0,
      quizAttempts: 0,
      quizAverageScore: 0,
      flashcardReviews: 0,
      flashcardRetention: 0,
      tutorQuestionsAsked: 0,
    };

    // Calculate mastery from concept data
    const calculatedMastery = calculateModuleMastery(module, conceptMasteries);
    progress.masteryScore = calculatedMastery;

    // Determine status
    const status = calculateModuleStatus(module, progress, roadmap.modules, progressMap);

    return {
      ...module,
      status,
      masteryScore: calculatedMastery,
    };
  });

  return {
    ...roadmap,
    modules: updatedModules,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 🎨 Get status color for UI rendering
 */
export function getStatusColor(status: ModuleStatus): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (status) {
    case 'mastered':
      return {
        bg: 'from-green-900/20 via-emerald-900/20 to-teal-900/20',
        border: 'border-green-500/30',
        text: 'text-green-300',
        icon: '🟢',
      };
    case 'in-progress':
      return {
        bg: 'from-yellow-900/30 via-amber-900/30 to-orange-900/30',
        border: 'border-yellow-500/40',
        text: 'text-yellow-300',
        icon: '🟡',
      };
    case 'needs-review':
      return {
        bg: 'from-red-900/30 via-rose-900/30 to-pink-900/30',
        border: 'border-red-500/40',
        text: 'text-red-300',
        icon: '🔴',
      };
    case 'available':
      return {
        bg: 'from-blue-900/20 via-indigo-900/20 to-purple-900/20',
        border: 'border-blue-500/30',
        text: 'text-blue-300',
        icon: '🔵',
      };
    case 'locked':
      return {
        bg: 'from-gray-900/30 via-slate-900/30 to-gray-900/30',
        border: 'border-gray-500/20',
        text: 'text-gray-400',
        icon: '🔒',
      };
  }
}

/**
 * 📈 Get recommended next action
 */
export function getNextAction(roadmap: AdaptiveRoadmap): {
  action: string;
  moduleId: string;
  message: string;
} {
  // Find first module that needs attention
  const needsReview = roadmap.modules.find(m => m.status === 'needs-review');
  if (needsReview) {
    return {
      action: 'review',
      moduleId: needsReview.id,
      message: `Review "${needsReview.title}" - your mastery has dropped below 70%`,
    };
  }

  const inProgress = roadmap.modules.find(m => m.status === 'in-progress');
  if (inProgress) {
    return {
      action: 'continue',
      moduleId: inProgress.id,
      message: `Continue "${inProgress.title}" to reach mastery`,
    };
  }

  const available = roadmap.modules.find(m => m.status === 'available');
  if (available) {
    return {
      action: 'start',
      moduleId: available.id,
      message: `Start "${available.title}" to unlock advanced content`,
    };
  }

  const allMastered = roadmap.modules.every(m => m.status === 'mastered');
  if (allMastered) {
    return {
      action: 'complete',
      moduleId: '',
      message: '🎉 All modules mastered! You\'ve completed this learning path.',
    };
  }

  return {
    action: 'locked',
    moduleId: '',
    message: 'Complete prerequisite modules to unlock more content',
  };
}
