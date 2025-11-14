// Gemini AI Integration
// Environment variables are now properly handled via Vite

import { withRateLimit } from './rate-limiter';

// Get API key from environment variable
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Use gemini-2.0-flash (Fast + Accurate, RECOMMENDED for quiz generation)
const GEMINI_MODEL = 'gemini-2.0-flash'; // ✅ Fast, accurate, handles PhD-level content
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Internal function that performs the actual API call
 * This is wrapped by generateWithGemini which adds rate limiting
 */
const _generateWithGeminiInternal = async (
  prompt: string, 
  config: GenerationConfig = {}
): Promise<string> => {
  // Validate API key
  if (!GEMINI_API_KEY) {
    throw new Error('⚠️ Gemini API key is not configured. Please add your API key in /lib/gemini.ts (line 14).');
  }

  const maxRetries = config.retries ?? 6; // Increased from 5 to 6
  const initialDelay = config.retryDelay ?? 3000; // Increased from 2s to 3s
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: config.temperature ?? 0.7,
            topK: config.topK ?? 40,
            topP: config.topP ?? 0.95,
            maxOutputTokens: config.maxOutputTokens ?? 2048,
          },
        }),
      });

      if (!response.ok) {
        // Get detailed error information
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || response.statusText;
        const errorStatus = response.status;
        
        console.error('Gemini API Error Details:', {
          status: errorStatus,
          message: errorMessage,
          fullError: errorData,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });

        // Check if this is a retryable error (503 Service Unavailable, 429 Rate Limit)
        const isRetryable = errorStatus === 503 || errorStatus === 429 || errorStatus === 500;
        
        if (isRetryable && attempt < maxRetries) {
          // Exponential backoff with jitter: 3s, 6s, 12s, 24s, 48s, 96s
          const exponentialDelay = initialDelay * Math.pow(2, attempt);
          const jitter = Math.random() * 1000; // Add 0-1s random jitter
          const delay = exponentialDelay + jitter;
          console.log(`🔄 Retrying in ${Math.ceil(delay/1000)}s... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await sleep(delay);
          continue; // Retry the request
        }

        // Provide helpful error messages based on status code
        if (errorStatus === 400) {
          throw new Error(`Invalid API request: ${errorMessage}`);
        } else if (errorStatus === 403) {
          throw new Error(`API authentication failed: ${errorMessage}. Check your API key and billing status in Google AI Studio.`);
        } else if (errorStatus === 429) {
          throw new Error(`⏱️ API rate limit reached. The system will automatically retry with delays. If this persists, please wait 1-2 minutes before generating new content.`);
        } else if (errorStatus === 404) {
          throw new Error(`Model "${GEMINI_MODEL}" not found. Please check your API key at https://aistudio.google.com/app/apikey`);
        } else if (errorStatus === 503) {
          throw new Error(`Service temporarily unavailable after ${maxRetries + 1} attempts. The AI model is overloaded. Please try again in a few minutes.`);
        } else {
          throw new Error(`Gemini API error (${errorStatus}): ${errorMessage}`);
        }
      }

      const data: GeminiResponse = await response.json();
      
      // Validate response structure
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response structure from Gemini API');
      }
      
      console.log(`✅ Gemini API request successful (attempt ${attempt + 1}/${maxRetries + 1})`);
      return data.candidates[0].content.parts[0].text;
      
    } catch (error) {
      lastError = error as Error;
      
      // If it's not a fetch error and we've exhausted retries, throw immediately
      if (attempt >= maxRetries) {
        console.error('Gemini API error (all retries exhausted):', error);
        throw error;
      }
      
      // If it's a non-retryable error (like validation error), throw immediately
      if (error instanceof Error && !error.message.includes('503') && !error.message.includes('429') && !error.message.includes('500')) {
        throw error;
      }
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('Failed to generate content after all retries');
};

/**
 * Generate content with Gemini AI with rate limiting and retry logic
 * This is the public API that should be used by all components
 */
export const generateWithGemini = async (
  prompt: string, 
  config: GenerationConfig = {}
): Promise<string> => {
  // Determine priority based on config or default to 0
  const priority = config.retries !== undefined ? 1 : 0; // Higher priority for explicit retry requests
  
  // Wrap the actual API call with rate limiting
  return withRateLimit(
    () => _generateWithGeminiInternal(prompt, config),
    priority
  );
};

// Generate quiz questions from a topic
export const generateQuiz = async (
  topic: string, 
  numQuestions: number = 10,
  difficulty: 'undergraduate' | 'graduate' | 'phd' = 'graduate'
) => {
  const difficultyInstructions = {
    undergraduate: 'Focus on fundamental concepts and basic understanding. Make questions straightforward.',
    graduate: 'Focus on analysis and application. Require deeper understanding.',
    phd: 'Focus on critical thinking and advanced concepts. Test sophisticated understanding.'
  };

  const prompt = `Generate ${numQuestions} multiple choice questions about ${topic} at ${difficulty} level.

${difficultyInstructions[difficulty]}

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks, no extra text):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]

Requirements:
- Questions must be clear and educational
- All options must be plausible
- correct_answer is 0-3 (index of correct option)
- Explanations should be concise and helpful
- Vary question types and difficulty`;

  try {
    const response = await generateWithGemini(prompt, {
      temperature: difficulty === 'phd' ? 0.6 : 0.7,
      maxOutputTokens: numQuestions * 400
    });
    
    // Extract JSON (handle markdown code blocks)
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.error('Failed to extract JSON from response:', response);
      throw new Error('Failed to parse quiz JSON');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions array');
    }

    return { questions, error: null };
  } catch (error) {
    console.error('Quiz generation error:', error);
    return { questions: null, error };
  }
};

// Generate flashcards from a topic
export const generateFlashcards = async (topic: string, numCards: number = 10) => {
  const prompt = `Generate ${numCards} flashcards about ${topic}.
  
Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "front": "Question or term",
    "back": "Answer or definition",
    "difficulty": 0
  }
]

Requirements:
- Front: Clear question or term
- Back: Comprehensive answer or definition
- Cover key concepts progressively`;

  try {
    const response = await generateWithGemini(prompt);
    
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse flashcards JSON');
    }
    
    const flashcards = JSON.parse(jsonMatch[0]);
    return { flashcards, error: null };
  } catch (error) {
    return { flashcards: null, error };
  }
};

// Chat with AI tutor
export const chatWithTutor = async (
  message: string, 
  conversationHistory: Array<{ role: string; content: string }> = []
) => {
  const contextPrompt = conversationHistory.length > 0
    ? conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\n'
    : '';

  const prompt = `${contextPrompt}You are a helpful AI tutor. Provide clear, educational responses.

Student: ${message}

AI Tutor:`;

  try {
    const response = await generateWithGemini(prompt, { temperature: 0.8 });
    return { response, error: null };
  } catch (error) {
    return { response: null, error };
  }
};

// Analyze document and extract key points
export const analyzeDocument = async (documentText: string) => {
  const prompt = `Analyze this document and provide:
1. Brief summary
2. Key points (3-5 bullets)
3. Main topics

Document:
${documentText.substring(0, 8000)}

Return as JSON (no markdown):
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "topics": ["...", "..."]
}`;

  try {
    const response = await generateWithGemini(prompt, { maxOutputTokens: 1024 });
    
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse analysis JSON');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    return { analysis, error: null };
  } catch (error) {
    return { analysis: null, error };
  }
};
