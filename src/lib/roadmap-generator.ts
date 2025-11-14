import { generateWithGemini } from './gemini';
import { ConceptMastery } from './database';
import { parseJSONResponse } from './json-parser-robust';

export interface RoadmapDay {
  day: number;
  focus: string;
  concepts: string[];
  resources: {
    flashcards?: string[];
    quizzes?: string[];
    conceptMap?: string;
    aiTutorQuestions?: string[];
  };
  checkpoint: string;
  estimatedTime: string; // e.g., "30-45 min"
}

export interface StudyRoadmap {
  title: string;
  documentName: string;
  duration: number; // number of days
  roadmap: RoadmapDay[];
  summary: string;
  generatedAt: string;
}

/**
 * Generate adaptive study roadmap using AI
 */
export async function generateAdaptiveRoadmap(
  weakConcepts: ConceptMastery[],
  documentName: string,
  documentContent: string,
  duration: number = 5
): Promise<{ roadmap: StudyRoadmap | null; error: any }> {
  try {
    // Format weak concepts for prompt
    const conceptList = weakConcepts
      .map((c, i) => `${i + 1}. ${c.concept_name} (mastery: ${(c.mastery_score * 100).toFixed(0)}%, attempts: ${c.total_attempts})`)
      .join('\n');

    const prompt = `You are an expert educational AI creating personalized study plans.

TASK: Generate a ${duration}-day adaptive study roadmap for a student struggling with specific concepts from "${documentName}".

WEAK CONCEPTS (prioritize these):
${conceptList}

DOCUMENT EXCERPT (first 3000 chars):
${documentContent.substring(0, 3000)}

REQUIREMENTS:
1. Focus ONLY on the weak concepts listed above
2. Order by priority (weakest/most fundamental first)
3. Each day should have:
   - 1-2 micro-topics (specific, actionable)
   - Recommended resources (flashcards, quizzes, concept map nodes, AI tutor questions)
   - A checkpoint question to verify understanding
   - Estimated time (realistic: 30-60 min/day)
4. Build progressively (foundational → advanced)
5. Reference specific concepts, not generic advice

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "title": "Mastering [Main Topic]",
  "documentName": "${documentName}",
  "duration": ${duration},
  "roadmap": [
    {
      "day": 1,
      "focus": "Specific Micro-Topic Title",
      "concepts": ["Concept A", "Concept B"],
      "resources": {
        "flashcards": ["Review flashcards about X", "Focus on Y definition"],
        "quizzes": ["Take 'Topic Name' quiz"],
        "conceptMap": "Explore the 'Node Name' node in Concept Map",
        "aiTutorQuestions": ["Ask: 'Why is X better than Y?'", "Ask: 'Explain Z in simple terms'"]
      },
      "checkpoint": "Answer: Explain concept X in your own words",
      "estimatedTime": "30-45 min"
    }
  ],
  "summary": "This roadmap focuses on your weakest areas in ${documentName}, targeting gaps in understanding.",
  "generatedAt": "${new Date().toISOString()}"
}

IMPORTANT:
- Return ONLY valid JSON (no markdown, no \`\`\`json)
- Each day must have actionable, specific tasks
- Checkpoint questions should test understanding, not just recall
- Prioritize weak concepts (lower mastery scores first)
`;

    // Use existing Gemini integration
    const text = await generateWithGemini(prompt, {
      temperature: 0.7,
      maxOutputTokens: 8000,
    });

    // Parse with robust JSON parser
    const parsed = parseJSONResponse(text);

    if (!parsed) {
      throw new Error('Failed to parse AI roadmap response');
    }

    return { roadmap: parsed as StudyRoadmap, error: null };
  } catch (error: any) {
    console.error('Error generating adaptive roadmap:', error);
    return { roadmap: null, error };
  }
}

/**
 * Generate a "Quick Fix" roadmap for a single concept
 */
export async function generateQuickFixPlan(
  conceptName: string,
  masteryScore: number,
  documentContent: string
): Promise<{ plan: RoadmapDay | null; error: any }> {
  try {
    const prompt = `You are an expert tutor. Create a focused 1-day study plan for mastering a single concept.

CONCEPT: ${conceptName}
CURRENT MASTERY: ${(masteryScore * 100).toFixed(0)}%

DOCUMENT EXCERPT:
${documentContent.substring(0, 2000)}

Create a micro-plan to improve understanding of "${conceptName}". Include:
- Specific resources to review
- Questions to ask the AI tutor
- A checkpoint to verify mastery

OUTPUT FORMAT (valid JSON only):
{
  "day": 1,
  "focus": "${conceptName}",
  "concepts": ["${conceptName}"],
  "resources": {
    "flashcards": ["Specific flashcard topics"],
    "conceptMap": "Node to explore",
    "aiTutorQuestions": ["Question 1", "Question 2"]
  },
  "checkpoint": "Verification question",
  "estimatedTime": "20-30 min"
}`;

    // Use existing Gemini integration
    const text = await generateWithGemini(prompt, {
      temperature: 0.6,
      maxOutputTokens: 2000,
    });

    const parsed = parseJSONResponse(text);

    if (!parsed) {
      throw new Error('Failed to parse quick fix plan');
    }

    return { plan: parsed as RoadmapDay, error: null };
  } catch (error: any) {
    console.error('Error generating quick fix plan:', error);
    return { plan: null, error };
  }
}

/**
 * Calculate overall mastery for a document
 */
export function calculateOverallMastery(concepts: ConceptMastery[]): number {
  if (concepts.length === 0) return 0;
  
  const totalScore = concepts.reduce((sum, c) => sum + c.mastery_score, 0);
  return totalScore / concepts.length;
}

/**
 * Categorize concepts by mastery level
 */
export function categorizeConcepts(concepts: ConceptMastery[]) {
  const weak = concepts.filter(c => c.mastery_score < 0.7);
  const moderate = concepts.filter(c => c.mastery_score >= 0.7 && c.mastery_score < 0.9);
  const strong = concepts.filter(c => c.mastery_score >= 0.9);

  return { weak, moderate, strong };
}
