/**
 * Multi-Hop Contextual Retrieval Engine
 * 
 * Implements iterative context expansion using BERT embeddings.
 * For each hop, retrieves semantically similar content and expands the context,
 * enabling discovery of implicit relationships across document sections.
 * 
 * Algorithm:
 * For each hop h < H:
 *   1. E ← BERT(Query ∪ CurrentContext)
 *   2. Retrieve docs where cosine_sim(E, doc) ≥ τ
 *   3. Expand: Context ← Context ∪ top-k docs
 * Output: Contexts with confidence ≥ γ
 * 
 * Use Cases:
 * - Cross-sectional quiz questions (Docker → Containers → Microservices → Kubernetes)
 * - Discovering implicit concept relationships
 * - Building knowledge chains for deep understanding
 */

import { EmbeddingService } from './embedding-service';

// ============================================================
// TYPES
// ============================================================

export interface MultiHopConfig {
  maxHops: number;              // H: Maximum retrieval iterations (default: 3)
  similarityThreshold: number;  // τ: Minimum cosine similarity (default: 0.65)
  topK: number;                 // k: Number of documents per hop (default: 5)
  confidenceThreshold: number;  // γ: Minimum confidence for results (default: 0.6)
  minChainLength: number;       // Minimum concept chain length (default: 2)
}

export interface HopStep {
  hop: number;                  // Hop iteration number (0-indexed)
  query: string;                // Query text for this hop
  retrievedChunks: string[];    // Retrieved document chunks
  similarities: number[];       // Similarity scores for each chunk
  concepts: string[];           // Extracted concepts from chunks
}

export interface MultiHopResult {
  conceptChain: string[];       // Chain of concepts discovered (e.g., ["Docker", "Container", "Microservices"])
  context: string[];            // All retrieved text chunks across hops
  confidence: number;           // Overall confidence score (0.0-1.0)
  hops: number;                 // Number of hops performed
  intermediateSteps: HopStep[]; // Detailed hop-by-hop progression
  success: boolean;             // Whether retrieval succeeded
  errorMessage?: string;        // Error details if failed
}

export interface DocumentChunk {
  text: string;                 // Chunk content
  index: number;                // Position in original document
  concepts?: string[];          // Extracted key concepts (optional)
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_CONFIG: MultiHopConfig = {
  maxHops: 3,
  similarityThreshold: 0.65,
  topK: 5,
  confidenceThreshold: 0.6,
  minChainLength: 2,
};

// ============================================================
// MULTI-HOP RETRIEVAL ENGINE
// ============================================================

export class MultiHopRetriever {
  /**
   * Perform multi-hop contextual retrieval
   * 
   * @param query - Initial concept or question
   * @param documentChunks - Pre-split document chunks (paragraphs/sections)
   * @param config - Retrieval configuration
   * @returns Multi-hop retrieval result with concept chain
   */
  static async retrieve(
    query: string,
    documentChunks: string[] | DocumentChunk[],
    config: Partial<MultiHopConfig> = {}
  ): Promise<MultiHopResult> {
    const finalConfig: MultiHopConfig = { ...DEFAULT_CONFIG, ...config };
    
    console.log('🔗 Starting multi-hop retrieval...');
    console.log(`   Query: "${query}"`);
    console.log(`   Config: ${finalConfig.maxHops} hops, τ=${finalConfig.similarityThreshold}, k=${finalConfig.topK}`);

    try {
      // Initialize BERT service
      const embeddingService = await EmbeddingService.getInstance();

      // Normalize document chunks
      const chunks: string[] = documentChunks.map(chunk => 
        typeof chunk === 'string' ? chunk : chunk.text
      );

      if (chunks.length === 0) {
        return this.createErrorResult('No document chunks provided');
      }

      // Initialize retrieval state
      let currentContext = [query];
      const intermediateSteps: HopStep[] = [];
      const allRetrievedChunks = new Set<string>();
      const conceptChain: string[] = [];

      // Extract initial concept from query
      const initialConcepts = this.extractConcepts(query);
      if (initialConcepts.length > 0) {
        conceptChain.push(initialConcepts[0]);
      }

      // Perform iterative retrieval
      for (let hop = 0; hop < finalConfig.maxHops; hop++) {
        console.log(`🔍 Hop ${hop + 1}/${finalConfig.maxHops}...`);

        // Step 1: Encode current context
        const contextText = currentContext.join(' ');
        const queryEmbedding = await embeddingService.encode(contextText);

        // Step 2: Calculate similarities with all chunks
        const chunkEmbeddings = await embeddingService.encodeBatch(chunks);
        
        const similarities = chunkEmbeddings.embeddings.map((chunkEmbed, idx) => ({
          text: chunks[idx],
          similarity: embeddingService.cosineSimilarity(queryEmbedding, chunkEmbed),
          index: idx,
        }));

        // Step 3: Filter by threshold and get top-k
        const relevantChunks = similarities
          .filter(item => item.similarity >= finalConfig.similarityThreshold)
          .filter(item => !allRetrievedChunks.has(item.text)) // Avoid duplicates
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, finalConfig.topK);

        if (relevantChunks.length === 0) {
          console.log(`⚠️ Hop ${hop + 1}: No relevant chunks found (threshold: ${finalConfig.similarityThreshold})`);
          break; // Early stopping
        }

        // Step 4: Extract concepts from retrieved chunks
        const newConcepts: string[] = [];
        relevantChunks.forEach(chunk => {
          const extracted = this.extractConcepts(chunk.text);
          newConcepts.push(...extracted);
          allRetrievedChunks.add(chunk.text);
        });

        // Add unique concepts to chain
        const uniqueNewConcepts = [...new Set(newConcepts)].filter(
          concept => !conceptChain.includes(concept)
        );
        conceptChain.push(...uniqueNewConcepts.slice(0, 2)); // Max 2 new concepts per hop

        // Step 5: Expand context with new chunks
        const newTexts = relevantChunks.map(c => c.text);
        currentContext.push(...newTexts);

        // Record hop step
        intermediateSteps.push({
          hop: hop + 1,
          query: contextText,
          retrievedChunks: newTexts,
          similarities: relevantChunks.map(c => c.similarity),
          concepts: uniqueNewConcepts,
        });

        console.log(`✅ Hop ${hop + 1}: Retrieved ${relevantChunks.length} chunks, found ${uniqueNewConcepts.length} new concepts`);
      }

      // Calculate overall confidence
      const avgConfidence = this.calculateConfidence(intermediateSteps);

      // Check success criteria
      const success = 
        conceptChain.length >= finalConfig.minChainLength &&
        avgConfidence >= finalConfig.confidenceThreshold;

      console.log(`🎯 Multi-hop complete: ${conceptChain.length} concepts, confidence: ${(avgConfidence * 100).toFixed(0)}%`);
      console.log(`   Concept chain: ${conceptChain.join(' → ')}`);

      return {
        conceptChain,
        context: Array.from(allRetrievedChunks),
        confidence: avgConfidence,
        hops: intermediateSteps.length,
        intermediateSteps,
        success,
      };

    } catch (error: any) {
      console.error('❌ Multi-hop retrieval failed:', error);
      return this.createErrorResult(error.message || 'Unknown error');
    }
  }

  /**
   * Extract key concepts from text (simple heuristic-based extraction)
   * In production, this could use NER or more sophisticated NLP
   */
  private static extractConcepts(text: string): string[] {
    // Extract capitalized words and technical terms
    const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    
    // Filter out common words and keep only meaningful concepts
    const stopWords = new Set(['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'How', 'Why']);
    const concepts = words
      .filter(word => !stopWords.has(word))
      .filter(word => word.length > 3) // Skip short words
      .slice(0, 5); // Max 5 concepts per text

    return [...new Set(concepts)]; // Remove duplicates
  }

  /**
   * Calculate overall confidence from hop steps
   */
  private static calculateConfidence(steps: HopStep[]): number {
    if (steps.length === 0) return 0;

    // Average of all similarity scores across hops
    const allSimilarities = steps.flatMap(step => step.similarities);
    if (allSimilarities.length === 0) return 0;

    const avgSimilarity = allSimilarities.reduce((sum, sim) => sum + sim, 0) / allSimilarities.length;
    
    // Penalize short chains (less than 3 concepts)
    const conceptCount = new Set(steps.flatMap(s => s.concepts)).size;
    const chainPenalty = conceptCount >= 3 ? 1.0 : 0.8;

    return avgSimilarity * chainPenalty;
  }

  /**
   * Create error result
   */
  private static createErrorResult(message: string): MultiHopResult {
    return {
      conceptChain: [],
      context: [],
      confidence: 0,
      hops: 0,
      intermediateSteps: [],
      success: false,
      errorMessage: message,
    };
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Quick multi-hop retrieval with default settings
 */
export async function quickMultiHopRetrieval(
  query: string,
  documentText: string,
  maxHops: number = 2
): Promise<MultiHopResult> {
  // Split document into paragraphs
  const chunks = documentText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 50); // Skip short paragraphs

  return MultiHopRetriever.retrieve(query, chunks, { maxHops });
}

/**
 * Extract concept chain only (simplified interface)
 */
export async function extractConceptChain(
  startConcept: string,
  documentChunks: string[]
): Promise<string[]> {
  const result = await MultiHopRetriever.retrieve(startConcept, documentChunks, {
    maxHops: 2,
    topK: 3,
  });

  return result.conceptChain;
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default MultiHopRetriever;
