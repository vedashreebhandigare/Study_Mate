/**
 * BERT Embedding Service
 * 
 * Provides semantic embeddings using all-MiniLM-L6-v2 model (384 dimensions)
 * Runs entirely in the browser using Transformers.js
 * 
 * Features:
 * - Browser-based inference (no backend required)
 * - Caching layer for performance
 * - Graceful error handling
 * - Cosine similarity calculations
 * 
 * Usage:
 * ```typescript
 * const service = await EmbeddingService.getInstance();
 * const embedding = await service.encode("Docker containers");
 * const similarity = service.cosineSimilarity(vec1, vec2);
 * ```
 */

import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';

// ============================================================
// CONFIGURATION
// ============================================================

const EMBEDDING_CONFIG = {
  modelName: 'Xenova/all-MiniLM-L6-v2', // 384-dim, fast inference, good quality
  dimensions: 384,
  maxCacheSize: 1000, // Maximum number of cached embeddings
  batchSize: 16, // Process embeddings in batches
  pooling: 'mean' as const, // Pooling strategy
  normalize: true, // Normalize embeddings for cosine similarity
} as const;

// ============================================================
// TYPES
// ============================================================

export interface EmbeddingOptions {
  pooling?: 'mean' | 'max' | 'cls';
  normalize?: boolean;
}

export interface BatchEncodeResult {
  embeddings: number[][];
  texts: string[];
  cached: number; // How many were from cache
  computed: number; // How many were newly computed
}

export interface SimilarityResult {
  similarity: number; // 0.0 to 1.0
  text1: string;
  text2: string;
}

// ============================================================
// EMBEDDING SERVICE (SINGLETON)
// ============================================================

export class EmbeddingService {
  private static instance: EmbeddingService | null = null;
  private embedder: FeatureExtractionPipeline | null = null;
  private cache = new Map<string, number[]>();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private statsStartTime = Date.now();
  
  // Performance statistics
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    totalEncodings: 0,
    totalInferenceTime: 0,
  };

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance (lazy initialization)
   */
  static async getInstance(): Promise<EmbeddingService> {
    if (!this.instance) {
      this.instance = new EmbeddingService();
    }
    
    if (!this.instance.isInitialized && !this.instance.initPromise) {
      this.instance.initPromise = this.instance.initialize();
    }
    
    await this.instance.initPromise;
    return this.instance;
  }

  /**
   * Initialize the BERT model (lazy loading)
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initializing BERT Embedding Service...');
      console.log(`📦 Model: ${EMBEDDING_CONFIG.modelName}`);
      
      // Configure Transformers.js environment
      env.allowLocalModels = false; // Use CDN models
      env.useBrowserCache = true; // Cache models in browser
      
      const startTime = Date.now();
      
      // Load the feature extraction pipeline
      this.embedder = await pipeline('feature-extraction', EMBEDDING_CONFIG.modelName);
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ BERT model loaded in ${loadTime}ms`);
      console.log(`📊 Embedding dimensions: ${EMBEDDING_CONFIG.dimensions}`);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize BERT Embedding Service:', error);
      this.isInitialized = false;
      throw new Error(`BERT initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encode a single text into an embedding vector
   */
  async encode(
    text: string, 
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    if (!this.embedder) {
      throw new Error('Embedding service not initialized. Call getInstance() first.');
    }

    // Normalize text for consistent caching
    const normalizedText = text.trim().toLowerCase();
    
    // Check cache first
    const cacheKey = this.getCacheKey(normalizedText, options);
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey)!;
    }

    try {
      this.stats.cacheMisses++;
      this.stats.totalEncodings++;
      
      const startTime = Date.now();
      
      // Generate embedding
      const output = await this.embedder(text, {
        pooling: options.pooling || EMBEDDING_CONFIG.pooling,
        normalize: options.normalize ?? EMBEDDING_CONFIG.normalize,
      });

      const inferenceTime = Date.now() - startTime;
      this.stats.totalInferenceTime += inferenceTime;

      // Convert tensor to array
      const embedding = Array.from(output.data) as number[];
      
      // Validate dimensions
      if (embedding.length !== EMBEDDING_CONFIG.dimensions) {
        throw new Error(
          `Invalid embedding dimensions: expected ${EMBEDDING_CONFIG.dimensions}, got ${embedding.length}`
        );
      }

      // Cache the result (with size limit)
      this.addToCache(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error('❌ Encoding failed:', error);
      throw new Error(`Failed to encode text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encode multiple texts in batch (more efficient)
   */
  async encodeBatch(
    texts: string[], 
    options: EmbeddingOptions = {}
  ): Promise<BatchEncodeResult> {
    const embeddings: number[][] = [];
    let cached = 0;
    let computed = 0;

    // Process in batches for performance
    for (let i = 0; i < texts.length; i += EMBEDDING_CONFIG.batchSize) {
      const batch = texts.slice(i, i + EMBEDDING_CONFIG.batchSize);
      
      for (const text of batch) {
        const normalizedText = text.trim().toLowerCase();
        const cacheKey = this.getCacheKey(normalizedText, options);
        
        if (this.cache.has(cacheKey)) {
          embeddings.push(this.cache.get(cacheKey)!);
          cached++;
        } else {
          const embedding = await this.encode(text, options);
          embeddings.push(embedding);
          computed++;
        }
      }
    }

    return { embeddings, texts, cached, computed };
  }

  /**
   * Calculate cosine similarity between two vectors
   * Returns: 0.0 (completely different) to 1.0 (identical)
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    // Dot product
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    // Avoid division by zero
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    // Cosine similarity formula
    const similarity = dotProduct / (magnitude1 * magnitude2);
    
    // Clamp to [0, 1] range (normalized embeddings should already be in this range)
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Calculate similarity between two texts (convenience method)
   */
  async calculateSimilarity(
    text1: string, 
    text2: string,
    options: EmbeddingOptions = {}
  ): Promise<SimilarityResult> {
    const [embedding1, embedding2] = await Promise.all([
      this.encode(text1, options),
      this.encode(text2, options),
    ]);

    const similarity = this.cosineSimilarity(embedding1, embedding2);

    return { similarity, text1, text2 };
  }

  /**
   * Find most similar texts from a list
   */
  async findMostSimilar(
    query: string,
    candidates: string[],
    topK: number = 5,
    threshold: number = 0.0
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    const queryEmbedding = await this.encode(query);
    const candidateEmbeddings = await this.encodeBatch(candidates);

    const similarities = candidateEmbeddings.embeddings.map((embedding, index) => ({
      text: candidates[index],
      similarity: this.cosineSimilarity(queryEmbedding, embedding),
      index,
    }));

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Embedding cache cleared');
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = (Date.now() - this.statsStartTime) / 1000; // seconds
    const avgInferenceTime = this.stats.totalEncodings > 0
      ? this.stats.totalInferenceTime / this.stats.totalEncodings
      : 0;
    const cacheHitRate = this.stats.totalEncodings > 0
      ? (this.stats.cacheHits / this.stats.totalEncodings) * 100
      : 0;

    return {
      isInitialized: this.isInitialized,
      cacheSize: this.cache.size,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalEncodings: this.stats.totalEncodings,
      avgInferenceTime: Math.round(avgInferenceTime),
      uptime: Math.round(uptime),
      modelName: EMBEDDING_CONFIG.modelName,
      dimensions: EMBEDDING_CONFIG.dimensions,
    };
  }

  /**
   * Print statistics to console
   */
  printStats(): void {
    const stats = this.getStats();
    console.log('📊 BERT Embedding Service Statistics:');
    console.log(`  Model: ${stats.modelName} (${stats.dimensions} dimensions)`);
    console.log(`  Uptime: ${stats.uptime}s`);
    console.log(`  Total encodings: ${stats.totalEncodings}`);
    console.log(`  Cache: ${stats.cacheSize} entries`);
    console.log(`  Cache hit rate: ${stats.cacheHitRate}%`);
    console.log(`  Avg inference time: ${stats.avgInferenceTime}ms`);
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private getCacheKey(text: string, options: EmbeddingOptions): string {
    const pooling = options.pooling || EMBEDDING_CONFIG.pooling;
    const normalize = options.normalize ?? EMBEDDING_CONFIG.normalize;
    return `${text}|${pooling}|${normalize}`;
  }

  private addToCache(key: string, embedding: number[]): void {
    // Implement LRU cache eviction if size limit exceeded
    if (this.cache.size >= EMBEDDING_CONFIG.maxCacheSize) {
      // Remove oldest entry (first key)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, embedding);
  }
}

// ============================================================
// CONVENIENCE EXPORTS
// ============================================================

/**
 * Quick access functions (auto-initializes service)
 */
export async function encodeText(text: string): Promise<number[]> {
  const service = await EmbeddingService.getInstance();
  return service.encode(text);
}

export async function calculateTextSimilarity(
  text1: string, 
  text2: string
): Promise<number> {
  const service = await EmbeddingService.getInstance();
  const result = await service.calculateSimilarity(text1, text2);
  return result.similarity;
}

export async function findSimilarTexts(
  query: string,
  candidates: string[],
  topK: number = 5
): Promise<Array<{ text: string; similarity: number }>> {
  const service = await EmbeddingService.getInstance();
  return service.findMostSimilar(query, candidates, topK);
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default EmbeddingService;
