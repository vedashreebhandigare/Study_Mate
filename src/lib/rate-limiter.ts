/**
 * Rate Limiter for Gemini API
 * Prevents hitting API rate limits by controlling request frequency
 */

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: number;
}

class RateLimiter {
  private queue: QueuedRequest<any>[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private resetTime = Date.now();
  
  // Configuration
  private readonly MIN_DELAY_MS = 1000; // Minimum 1 second between requests
  private readonly MAX_REQUESTS_PER_MINUTE = 15; // Conservative limit
  private readonly BURST_DELAY_MS = 3000; // 3 second delay after burst detection

  /**
   * Check if we're at risk of rate limiting
   */
  private shouldThrottle(): { throttle: boolean; delay: number } {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.resetTime > 60000) {
      this.requestCount = 0;
      this.resetTime = now;
    }

    // Check if we've hit the per-minute limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.resetTime);
      console.warn(`⚠️ Rate limit approaching. Waiting ${Math.ceil(waitTime/1000)}s before next request.`);
      return { throttle: true, delay: waitTime };
    }

    // Check minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_DELAY_MS) {
      const delay = this.MIN_DELAY_MS - timeSinceLastRequest;
      return { throttle: true, delay };
    }

    // Detect burst (more than 5 requests in 10 seconds)
    if (this.requestCount > 5 && (now - this.resetTime) < 10000) {
      console.warn('⚠️ Burst detected. Adding delay to prevent rate limit.');
      return { throttle: true, delay: this.BURST_DELAY_MS };
    }

    return { throttle: false, delay: 0 };
  }

  /**
   * Process the request queue
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Check throttling
      const { throttle, delay } = this.shouldThrottle();
      
      if (throttle) {
        console.log(`⏱️ Throttling request. Waiting ${Math.ceil(delay/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Sort queue by priority (higher = more important)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      const request = this.queue.shift();
      if (!request) break;

      try {
        console.log(`🚀 Processing request (${this.queue.length} remaining in queue)`);
        
        // Track request timing
        this.lastRequestTime = Date.now();
        this.requestCount++;
        
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Small delay between queue items
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessing = false;
  }

  /**
   * Add a request to the queue
   */
  async enqueue<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        priority
      });

      console.log(`📝 Request queued (position: ${this.queue.length}, priority: ${priority})`);
      
      // Start processing if not already running
      this.processQueue();
    });
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      requestCount: this.requestCount,
      requestsRemaining: this.MAX_REQUESTS_PER_MINUTE - this.requestCount,
      resetIn: Math.max(0, 60000 - (Date.now() - this.resetTime))
    };
  }

  /**
   * Clear the queue (emergency use only)
   */
  clearQueue() {
    console.warn('⚠️ Clearing request queue');
    this.queue = [];
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Wrap a Gemini API call with rate limiting
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  priority: number = 0
): Promise<T> {
  return rateLimiter.enqueue(fn, priority);
}

/**
 * Get rate limiter status for UI display
 */
export function getRateLimitStatus() {
  return rateLimiter.getStatus();
}
