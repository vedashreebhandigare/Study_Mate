/**
 * Advanced Flashcard Generator with 6 Cognitive Clusters
 * Generates flashcards from documents with embedded mini-visualizations
 */

import { generateWithGemini } from './gemini';
import { ClusterType, DifficultyLevel, VisualizationMetadata, Flashcard } from './database';

export interface FlashcardGenerationOptions {
  documentText: string;
  deckName: string;
  totalCards?: number;
  distribution?: ClusterDistribution;
}

export interface ClusterDistribution {
  'Foundational Concepts': number;
  'Architectural Mechanics': number;
  'Comparative Analysis': number;
  'Performance Metrics': number;
  'Context & Big Picture': number;
  'Critical Thinking': number;
}

export interface GenerationProgress {
  stage: 'analyzing' | 'generating' | 'validating' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  cluster?: ClusterType;
}

export interface FlashcardGenerationResult {
  flashcards: Omit<Flashcard, 'id' | 'user_id' | 'created_at'>[];
  metadata: {
    totalCards: number;
    distribution: ClusterDistribution;
    generationTime: number;
  };
}

// ✅ Default cluster distribution (weighted towards Critical Thinking)
const DEFAULT_DISTRIBUTION: ClusterDistribution = {
  'Foundational Concepts': 2,
  'Architectural Mechanics': 2,
  'Comparative Analysis': 3,
  'Performance Metrics': 2,
  'Context & Big Picture': 2,
  'Critical Thinking': 4, // Priority per to-do.md
};

// ✅ Cluster definitions with cognitive frameworks
const CLUSTER_DEFINITIONS = {
  'Foundational Concepts': {
    emoji: '🎯',
    difficulty: 'undergrad' as DifficultyLevel,
    description: 'Terms, datasets, components, basic definitions',
    visualization: 'iconography',
    cognitiveLevel: 'Remember, Understand',
    examples: [
      'What is the primary purpose of the Kitsune feature set?',
      'Define the concept of intrusion detection in IoT networks',
    ],
    avoid: ['Author names', 'Publication details', 'Affiliation info'],
  },
  'Architectural Mechanics': {
    emoji: '🏗️',
    difficulty: 'graduate' as DifficultyLevel,
    description: 'How models work, layer functions, data flow',
    visualization: 'diagram',
    cognitiveLevel: 'Understand, Apply',
    examples: [
      'How does the CNN layer extract spatial features from network traffic?',
      'Explain the role of the attention mechanism in the hybrid model',
    ],
    avoid: ['Surface-level descriptions', 'Pure memorization'],
  },
  'Comparative Analysis': {
    emoji: '⚖️',
    difficulty: 'graduate' as DifficultyLevel,
    description: 'Model/dataset comparisons, trade-offs',
    visualization: 'bar_chart',
    cognitiveLevel: 'Analyze, Evaluate',
    examples: [
      'Why might CNN-GRU be preferred over CNN-LSTM in edge IoT deployments?',
      'Compare the detection accuracy of the hybrid model on TON-IoT vs Kitsune',
    ],
    avoid: ['Simple "which is better" without reasoning'],
  },
  'Performance Metrics': {
    emoji: '📈',
    difficulty: 'graduate' as DifficultyLevel,
    description: 'Results interpretation, confusion matrices, FNR/FPR',
    visualization: 'confusion_matrix',
    cognitiveLevel: 'Apply, Analyze',
    examples: [
      'Why is the 99.6% accuracy on Kitsune significant for real-world deployment?',
      'What does the low false negative rate indicate about the model\'s reliability?',
    ],
    avoid: ['Pure accuracy reporting', '"What is the accuracy?" questions'],
  },
  'Context & Big Picture': {
    emoji: '🌍',
    difficulty: 'graduate' as DifficultyLevel,
    description: 'Motivation, impact, future work, broader implications',
    visualization: 'timeline',
    cognitiveLevel: 'Understand, Evaluate',
    examples: [
      'Why is lightweight intrusion detection critical for IoT edge devices?',
      'What future research directions could improve the model\'s generalization?',
    ],
    avoid: ['Vague generalizations', 'Non-technical content'],
  },
  'Critical Thinking': {
    emoji: '🧠',
    difficulty: 'phd' as DifficultyLevel,
    description: 'Critique assumptions, limitations, theoretical implications',
    visualization: 'concept_map',
    cognitiveLevel: 'Evaluate, Create',
    examples: [
      'Critique the assumption that pre-extracted features generalize to zero-day attacks',
      'Under what conditions might the CNN-GRU hybrid fail in adversarial scenarios?',
    ],
    avoid: ['Factual recall', 'Surface-level questions'],
  },
};

export class AdvancedFlashcardGenerator {
  /**
   * ✅ FIX: Scale distribution to match target total
   */
  private static scaleDistribution(
    baseDistribution: ClusterDistribution,
    targetTotal: number
  ): ClusterDistribution {
    const baseTotal = Object.values(baseDistribution).reduce((a, b) => a + b, 0);
    const scaleFactor = targetTotal / baseTotal;
    
    const scaled: any = {};
    let allocated = 0;
    const clusters = Object.keys(baseDistribution) as ClusterType[];
    
    // Scale each cluster proportionally
    clusters.forEach((cluster, index) => {
      if (index === clusters.length - 1) {
        // Last cluster gets the remainder to ensure exact total
        scaled[cluster] = targetTotal - allocated;
      } else {
        const value = Math.max(1, Math.round(baseDistribution[cluster] * scaleFactor));
        scaled[cluster] = value;
        allocated += value;
      }
    });
    
    return scaled as ClusterDistribution;
  }

  /**
   * ✅ FIX: Validate distribution has no zero or negative values
   */
  private static validateDistribution(distribution: ClusterDistribution): ClusterDistribution {
    const validated: any = { ...distribution };
    
    for (const [cluster, count] of Object.entries(validated)) {
      if (count <= 0) {
        console.warn(`⚠️ Cluster "${cluster}" has invalid count (${count}). Setting to 1.`);
        validated[cluster] = 1;
      }
    }
    
    return validated as ClusterDistribution;
  }

  /**
   * Generate flashcards from document with 6 cognitive clusters
   */
  static async generateFlashcards(
    options: FlashcardGenerationOptions,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<FlashcardGenerationResult> {
    const startTime = performance.now();
    const totalCards = options.totalCards || 15;
    
    // ✅ FIX: Calculate proportional distribution if custom totalCards provided
    let distribution: ClusterDistribution;
    if (options.distribution) {
      distribution = options.distribution;
    } else {
      // Scale DEFAULT_DISTRIBUTION to match totalCards
      distribution = this.scaleDistribution(DEFAULT_DISTRIBUTION, totalCards);
    }

    const allFlashcards: Omit<Flashcard, 'id' | 'user_id' | 'created_at'>[] = [];

    try {
      // Stage 1: Analyze content
      onProgress?.({
        stage: 'analyzing',
        progress: 10,
        message: 'Analyzing document for cognitive clusters...',
      });

      // Validate distribution adds up to totalCards
      const distributionTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
      if (distributionTotal !== totalCards) {
        console.warn(`⚠️ Distribution total (${distributionTotal}) doesn't match totalCards (${totalCards}). Adjusting...`);
        distribution = this.scaleDistribution(distribution, totalCards);
      }
      
      // ✅ FIX: Ensure no cluster has 0 or negative cards
      const validDistribution = this.validateDistribution(distribution);
      console.log('📊 Flashcard distribution:', validDistribution);

      // Stage 2: Generate flashcards for each cluster
      let currentProgress = 20;
      const progressPerCluster = 60 / Object.keys(validDistribution).length;

      for (const [clusterName, cardCount] of Object.entries(validDistribution)) {
        if (cardCount <= 0) continue; // ✅ Skip invalid counts

        const cluster = clusterName as ClusterType;
        
        onProgress?.({
          stage: 'generating',
          progress: currentProgress,
          message: `Generating ${cardCount} cards for ${cluster}...`,
          cluster,
        });

        // Generate cards for this cluster
        const clusterCards = await this.generateClusterCards(
          options.documentText,
          cluster,
          cardCount,
          options.deckName
        );

        allFlashcards.push(...clusterCards);
        currentProgress += progressPerCluster;
      }

      // Stage 3: Validate
      onProgress?.({
        stage: 'validating',
        progress: 90,
        message: 'Validating flashcard quality...',
      });

      // Ensure we have the right number
      if (allFlashcards.length < totalCards * 0.8) {
        throw new Error(`Only generated ${allFlashcards.length} cards, expected ${totalCards}`);
      }

      // Stage 4: Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Successfully generated ${allFlashcards.length} flashcards across 6 cognitive clusters!`,
      });

      const generationTime = performance.now() - startTime;

      return {
        flashcards: allFlashcards.slice(0, totalCards),
        metadata: {
          totalCards: allFlashcards.length,
          distribution: validDistribution,
          generationTime,
        },
      };
    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      throw error;
    }
  }

  /**
   * Generate cards for a specific cluster
   */
  private static async generateClusterCards(
    documentText: string,
    cluster: ClusterType,
    cardCount: number,
    deckName: string
  ): Promise<Omit<Flashcard, 'id' | 'user_id' | 'created_at'>[]> {
    // ✅ FIX: Validate cardCount to prevent 0 or negative maxOutputTokens
    if (cardCount <= 0) {
      console.warn(`⚠️ Skipping cluster "${cluster}" - cardCount is ${cardCount}`);
      return [];
    }

    const clusterDef = CLUSTER_DEFINITIONS[cluster];
    const prompt = this.buildClusterPrompt(documentText, cluster, cardCount, clusterDef);

    // ✅ FIX: Ensure maxOutputTokens is always positive (minimum 600)
    const maxTokens = Math.max(600, cardCount * 600);

    // Call Gemini with auto-retry on 503 errors
    const response = await generateWithGemini(prompt, {
      temperature: cluster === 'Critical Thinking' ? 0.7 : 0.5,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: maxTokens,
      retries: 5, // Auto-retry on overload
      retryDelay: 2000, // Exponential backoff starting at 2s
    });

    // Parse response
    const cards = this.parseFlashcardResponse(response, cluster, deckName, clusterDef);

    return cards;
  }

  /**
   * Build prompt for specific cluster
   */
  private static buildClusterPrompt(
    documentText: string,
    cluster: ClusterType,
    cardCount: number,
    clusterDef: typeof CLUSTER_DEFINITIONS[ClusterType]
  ): string {
    return `You are an expert educational content creator specializing in ${cluster} flashcards using Bloom's Taxonomy.

📚 DOCUMENT CONTENT:
${documentText.slice(0, 15000)} ${documentText.length > 15000 ? '...(truncated)' : ''}

🎯 CLUSTER: ${cluster}
${clusterDef.emoji} DESCRIPTION: ${clusterDef.description}
📊 DIFFICULTY LEVEL: ${clusterDef.difficulty}
🧠 COGNITIVE LEVEL: ${clusterDef.cognitiveLevel}

VISUALIZATION TYPE: ${clusterDef.visualization}
- ALWAYS include visualization metadata - it's a conceptual description, not a reference to an existing figure
- Visualizations are text descriptions of mini-diagrams/charts/icons to enhance understanding
- Think of them as "if you were to draw this concept, what would it show?"
- Max 150x150px conceptually

✅ MANDATORY CONSTRAINTS:
1. **No hallucinations**: All content must be traceable to the document content
2. **No biographical trivia**: Exclude author bios, affiliations, funding
3. **Visualizations REQUIRED**: Every card MUST have a visualization object (describe what would be helpful to visualize)
4. **Source tracking**: Include general source reference (e.g., "Main methodology section", "Performance results")
5. **Tag appropriately**: Use 2-4 relevant tags per card

⚠️ PROHIBITED PATTERNS:
- ❌ "What is the accuracy?" → Too factual. Instead: "Why is 99.6% accuracy significant?"
- ❌ "Author X works on Y" → Irrelevant
- ❌ Complex math without explanation → Always pair equations with plain-English translation
- ❌ ${clusterDef.avoid.join(', ')}

📋 EXAMPLES FOR THIS CLUSTER:
${clusterDef.examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

🎨 VISUALIZATION GUIDANCE FOR ${clusterDef.visualization}:
${this.getVisualizationGuidance(clusterDef.visualization)}

⚠️ CRITICAL JSON FORMATTING RULES:
1. Return ONLY a JSON array - no markdown, no code blocks, no text before/after
2. ALL property names MUST use double quotes: "front", "back", "source", "tags", "visualization"
3. ALL string values MUST use double quotes " NOT single quotes '
4. NO trailing commas before ] or }
5. Escape quotes inside strings using \"
6. DO NOT use unquoted property names like {front: ...} - MUST be {"front": ...}

VALID EXAMPLE:
[
  {
    "front": "Question that requires ${clusterDef.cognitiveLevel} thinking?",
    "back": "Detailed answer with technical depth, explaining WHY and HOW (100-200 chars)",
    "source": "Main methodology section",
    "tags": ["tag1", "tag2", "tag3"],
    "visualization": {
      "type": "${clusterDef.visualization}",
      "description": "Describe what would be shown if visualized (e.g., 'Side-by-side bar chart comparing CNN-GRU vs CNN-LSTM test times')",
      "caption": "Short caption explaining the key insight (e.g., 'CNN-GRU processes 2x faster')",
      "annotations": ["Label1", "Label2", "Label3"]
    }
  }
]

CRITICAL REQUIREMENTS:
- Generate EXACTLY ${cardCount} cards
- All cards must be for the "${cluster}" cluster
- Difficulty level: "${clusterDef.difficulty}"
- Every card MUST have a source reference (can be general like "Performance section")
- Every card MUST have a visualization object (describe conceptually, don't reference figures that may not exist)
- Return ONLY the JSON array with proper double-quoted property names, nothing else`;
  }

  /**
   * Get visualization guidance for each type
   */
  private static getVisualizationGuidance(type: string): string {
    const guidance = {
      iconography: 'Describe what icon would represent this concept (e.g., "Shield icon with lock symbol for encryption"). Use description field to explain what would be shown.',
      diagram: 'Describe a simplified architecture diagram with key components and data flow. Example: "Flow diagram showing Input Layer → CNN → GRU → Output with arrows and labels". Annotations are component names.',
      bar_chart: 'Describe a bar chart comparing metrics. Example: "3-bar chart comparing accuracy: Model A (95%), Model B (87%), Baseline (72%)". Annotations are the metric names/values.',
      heatmap: 'Describe a heatmap showing performance. Example: "Grid showing precision across 5 attack types and 3 datasets, with darker = better". Annotations are axis labels.',
      confusion_matrix: 'Describe a 2x2 confusion matrix. Example: "Matrix showing True Positives (high), False Positives (low), True Negatives (high), False Negatives (low)". Annotations are TP/FP/TN/FN.',
      timeline: 'Describe a timeline or roadmap. Example: "Timeline showing: 2020 (baseline), 2022 (hybrid models), 2024 (edge deployment), Future (federated learning)". Annotations are milestones.',
      concept_map: 'Describe a concept map with connected nodes. Example: "Central node: CNN-GRU, connected to: Feature Extraction, Temporal Analysis, Classification, with arrows showing flow". Annotations are node names.',
    };
    return guidance[type] || 'Describe the visualization conceptually with key elements that would appear if drawn.';
  }

  /**
   * Parse Gemini response into flashcards
   */
  private static parseFlashcardResponse(
    response: string,
    cluster: ClusterType,
    deckName: string,
    clusterDef: typeof CLUSTER_DEFINITIONS[ClusterType]
  ): Omit<Flashcard, 'id' | 'user_id' | 'created_at'>[] {
    try {
      console.log('📝 Parsing flashcard response (length:', response.length, 'chars)');
      
      // Remove markdown code blocks if present
      let cleaned = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Extract JSON array with greedy matching
      let jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      
      // If no match, try to find the first [ and last ] to extract the array
      if (!jsonMatch) {
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
          cleaned = cleaned.substring(firstBracket, lastBracket + 1);
          jsonMatch = [cleaned];
        } else {
          throw new Error('No valid JSON array found in response');
        }
      }

      let jsonString = jsonMatch[0];
      
      // Fix common JSON issues
      // Fix unquoted property names (word followed by colon, not inside quotes)
      jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      
      // Replace single quotes with double quotes (but be careful with apostrophes in strings)
      const protectedStrings: string[] = [];
      jsonString = jsonString.replace(/"([^"]*)"/g, (match, content) => {
        protectedStrings.push(content);
        return `__PROTECTED_${protectedStrings.length - 1}__`;
      });
      
      // Now replace single quotes with double quotes
      jsonString = jsonString.replace(/'/g, '"');
      
      // Restore protected strings
      jsonString = jsonString.replace(/__PROTECTED_(\d+)__/g, (match, index) => {
        return `"${protectedStrings[parseInt(index)]}"`;
      });
      
      // Remove trailing commas before ] or }
      jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');
      
      // Fix unescaped newlines in strings
      jsonString = jsonString.replace(/"([^"]*)\n([^"]*)"/g, '"$1\\n$2"');
      
      // Fix unescaped tabs
      jsonString = jsonString.replace(/"([^"]*)\t([^"]*)"/g, '"$1\\t$2"');
      
      // Fix potential double-double quotes
      jsonString = jsonString.replace(/""+/g, '"');

      console.log('🧹 Cleaned JSON (first 200 chars):', jsonString.substring(0, 200));

      let parsed: any[];
      
      try {
        parsed = JSON.parse(jsonString);
        console.log('✅ Standard JSON parse successful');
      } catch (parseError) {
        console.warn('⚠️ Standard parse failed, trying manual extraction...', parseError);
        parsed = this.extractFlashcardsManually(jsonString);
        console.log('✅ Manual extraction successful');
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Parsed result is not a valid flashcard array');
      }

      // Convert to our Flashcard format
      const flashcards = parsed.map((card: any, index: number) => {
        try {
          // Validate required fields
          if (!card.front || !card.back) {
            console.warn(`⚠️ Skipping invalid flashcard at index ${index}:`, card);
            return null;
          }

          return {
            deck_name: deckName,
            cluster,
            front: String(card.front).trim(),
            back: String(card.back).trim(),
            source: card.source ? String(card.source).trim() : 'Document content',
            difficulty_level: clusterDef.difficulty,
            tags: Array.isArray(card.tags) ? card.tags : [],
            visualization: card.visualization || null,
            review_difficulty: 0,
          };
        } catch (mapError) {
          console.warn(`⚠️ Error mapping flashcard at index ${index}:`, mapError);
          return null;
        }
      }).filter((card): card is Omit<Flashcard, 'id' | 'user_id' | 'created_at'> => card !== null);

      if (flashcards.length === 0) {
        throw new Error('No valid flashcards found after parsing');
      }

      console.log(`✅ Successfully parsed ${flashcards.length} flashcards`);
      return flashcards;
      
    } catch (error: any) {
      console.error('❌ Failed to parse flashcard response:', error);
      console.log('📄 Response preview (first 500 chars):', response.substring(0, 500));
      console.log('📄 Response preview (last 500 chars):', response.substring(Math.max(0, response.length - 500)));
      throw new Error(`Failed to parse flashcards for ${cluster}: ${error.message}`);
    }
  }

  /**
   * Manual extraction fallback when JSON.parse fails
   * Handles unquoted/single-quoted property names and values
   */
  private static extractFlashcardsManually(jsonString: string): any[] {
    console.log('🔧 Attempting manual flashcard extraction...');
    console.log('📄 JSON preview (first 300 chars):', jsonString.substring(0, 300));
    
    const flashcards: any[] = [];
    
    // First, try to fix common JSON issues
    let fixedJson = jsonString
      // Replace single quotes with double quotes
      .replace(/'/g, '"')
      // Fix unquoted property names
      .replace(/(\w+)\s*:/g, '"$1":')
      // Remove trailing commas
      .replace(/,\s*([\]}])/g, '$1')
      // Fix double-double quotes
      .replace(/""+/g, '"');
    
    console.log('🔧 Fixed JSON preview (first 300 chars):', fixedJson.substring(0, 300));
    
    // Try parsing the fixed JSON first
    try {
      const parsed = JSON.parse(fixedJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('✅ Fixed JSON parsed successfully!');
        return parsed;
      }
    } catch (e) {
      console.warn('⚠️ Fixed JSON still invalid, trying regex extraction...');
    }
    
    // Pattern 1: Flexible pattern matching both quoted and unquoted property names
    const flexiblePattern = /['"']?front['"']?\s*:\s*['"']([^'"]+)['"']\s*,?\s*['"']?back['"']?\s*:\s*['"']([^'"]+)['"']/gi;
    
    let match;
    while ((match = flexiblePattern.exec(jsonString)) !== null) {
      try {
        const front = match[1];
        const back = match[2];
        
        if (front && back) {
          // Try to find source and tags in the surrounding context
          const cardStartPos = match.index;
          const cardEndPos = jsonString.indexOf('}', cardStartPos);
          const cardSection = cardEndPos > cardStartPos 
            ? jsonString.substring(cardStartPos, cardEndPos) 
            : jsonString.substring(cardStartPos, cardStartPos + 500);
          
          const sourceMatch = cardSection.match(/['"']?source['"']?\s*:\s*['"']([^'"]*)['"']/i);
          const tagsMatch = cardSection.match(/['"']?tags['"']?\s*:\s*\[([^\]]*)\]/i);
          
          let tags: string[] = [];
          if (tagsMatch) {
            const tagPattern = /['"']([^'"]+)['"']/g;
            let tagMatch;
            while ((tagMatch = tagPattern.exec(tagsMatch[1])) !== null) {
              tags.push(tagMatch[1]);
            }
          }
          
          flashcards.push({
            front,
            back,
            source: sourceMatch ? sourceMatch[1] : 'Document content',
            tags
          });
        }
      } catch (extractError) {
        console.warn('⚠️ Failed to extract a flashcard:', extractError);
      }
    }
    
    // Pattern 2: If still no flashcards, try ultra-flexible extraction
    if (flashcards.length === 0) {
      console.log('🔧 Trying ultra-flexible extraction...');
      
      // Split by object boundaries
      const objectSplits = jsonString.split(/[{}]/);
      
      for (const section of objectSplits) {
        try {
          // Look for front
          const frontMatch = section.match(/front['"']?\s*:\s*['"']([^'"]+)['"']/i);
          if (!frontMatch) continue;
          
          // Look for back
          const backMatch = section.match(/back['"']?\s*:\s*['"']([^'"]+)['"']/i);
          if (!backMatch) continue;
          
          // Optional: source and tags
          const sourceMatch = section.match(/source['"']?\s*:\s*['"']([^'"]*)['"']/i);
          const tagsMatch = section.match(/tags['"']?\s*:\s*\[([^\]]*)\]/i);
          
          let tags: string[] = [];
          if (tagsMatch) {
            const tagPattern = /['"']([^'"]+)['"']/g;
            let tm;
            while ((tm = tagPattern.exec(tagsMatch[1])) !== null) {
              tags.push(tm[1]);
            }
          }
          
          flashcards.push({
            front: frontMatch[1],
            back: backMatch[1],
            source: sourceMatch ? sourceMatch[1] : 'Document content',
            tags
          });
        } catch (e) {
          // Skip this section
        }
      }
    }
    
    console.log(`🔧 Manual extraction found ${flashcards.length} flashcards`);
    
    if (flashcards.length === 0) {
      console.error('❌ No flashcards found. JSON structure:');
      console.log('Sample:', jsonString.substring(0, 500));
      throw new Error('Manual extraction found no valid flashcards');
    }
    
    return flashcards;
  }

  /**
   * Calculate smart distribution based on document complexity
   */
  static calculateDistribution(
    totalCards: number,
    documentComplexity: 'basic' | 'advanced' | 'research' = 'advanced'
  ): ClusterDistribution {
    const ratios = {
      basic: {
        'Foundational Concepts': 0.30,
        'Architectural Mechanics': 0.25,
        'Comparative Analysis': 0.15,
        'Performance Metrics': 0.15,
        'Context & Big Picture': 0.10,
        'Critical Thinking': 0.05,
      },
      advanced: {
        'Foundational Concepts': 0.13,
        'Architectural Mechanics': 0.13,
        'Comparative Analysis': 0.20,
        'Performance Metrics': 0.13,
        'Context & Big Picture': 0.13,
        'Critical Thinking': 0.27,
      },
      research: {
        'Foundational Concepts': 0.10,
        'Architectural Mechanics': 0.10,
        'Comparative Analysis': 0.20,
        'Performance Metrics': 0.10,
        'Context & Big Picture': 0.15,
        'Critical Thinking': 0.35,
      },
    };

    const ratio = ratios[documentComplexity];
    const distribution: ClusterDistribution = {
      'Foundational Concepts': Math.round(totalCards * ratio['Foundational Concepts']),
      'Architectural Mechanics': Math.round(totalCards * ratio['Architectural Mechanics']),
      'Comparative Analysis': Math.round(totalCards * ratio['Comparative Analysis']),
      'Performance Metrics': Math.round(totalCards * ratio['Performance Metrics']),
      'Context & Big Picture': Math.round(totalCards * ratio['Context & Big Picture']),
      'Critical Thinking': 0, // Calculate last to ensure total matches
    };

    // Ensure total matches
    const currentTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
    distribution['Critical Thinking'] = totalCards - currentTotal;

    return distribution;
  }
}
