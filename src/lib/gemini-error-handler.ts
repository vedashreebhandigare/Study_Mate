/**
 * Gemini Error Handler
 * Provides user-friendly error messages and retry suggestions
 */

export interface GeminiErrorInfo {
  message: string;
  userMessage: string;
  retryable: boolean;
  suggestedAction: string;
  technicalDetails?: any;
}

export const handleGeminiError = (error: any): GeminiErrorInfo => {
  const errorMessage = error?.message || String(error);
  
  // 503 - Service Overloaded
  if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE')) {
    return {
      message: errorMessage,
      userMessage: '🔄 The AI service is currently experiencing high demand',
      retryable: true,
      suggestedAction: 'The system automatically retried 3 times with increasing delays (3s → 6s → 12s). Please wait 1-2 minutes before trying again. This is temporary and usually resolves quickly.',
      technicalDetails: error,
    };
  }
  
  // 429 - Rate Limited
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return {
      message: errorMessage,
      userMessage: '⏱️ API rate limit reached',
      retryable: true,
      suggestedAction: 'Please wait 1-2 minutes before trying again.',
      technicalDetails: error,
    };
  }
  
  // 500/502 - Server Error
  if (errorMessage.includes('500') || errorMessage.includes('502')) {
    return {
      message: errorMessage,
      userMessage: '🔧 Temporary server error',
      retryable: true,
      suggestedAction: 'The system will automatically retry. If this persists, try again in a few minutes.',
      technicalDetails: error,
    };
  }
  
  // 403 - Authentication
  if (errorMessage.includes('403') || errorMessage.includes('authentication')) {
    return {
      message: errorMessage,
      userMessage: '🔑 API authentication error',
      retryable: false,
      suggestedAction: 'Check your Gemini API key in /lib/gemini.ts and verify billing is enabled in Google AI Studio.',
      technicalDetails: error,
    };
  }
  
  // 404 - Model Not Found
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return {
      message: errorMessage,
      userMessage: '❌ AI model not available',
      retryable: false,
      suggestedAction: 'Verify your API key has access to gemini-2.0-flash at https://aistudio.google.com/app/apikey',
      technicalDetails: error,
    };
  }
  
  // 400 - Bad Request
  if (errorMessage.includes('400') || errorMessage.includes('Invalid')) {
    return {
      message: errorMessage,
      userMessage: '⚠️ Invalid request format',
      retryable: false,
      suggestedAction: 'The document might be too large or in an unsupported format. Try a smaller document.',
      technicalDetails: error,
    };
  }
  
  // Network Errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('NetworkError')) {
    return {
      message: errorMessage,
      userMessage: '🌐 Network connection error',
      retryable: true,
      suggestedAction: 'Check your internet connection. The system will automatically retry.',
      technicalDetails: error,
    };
  }
  
  // Generic Error
  return {
    message: errorMessage,
    userMessage: '❌ An error occurred',
    retryable: false,
    suggestedAction: 'Please try again or contact support if the issue persists.',
    technicalDetails: error,
  };
};

export const formatErrorForUser = (errorInfo: GeminiErrorInfo): string => {
  return `${errorInfo.userMessage}\n\n${errorInfo.suggestedAction}`;
};

export const shouldShowRetryUI = (errorInfo: GeminiErrorInfo): boolean => {
  return errorInfo.retryable;
};
