/**
 * Gemini Error Display - Shows user-friendly error messages with retry info
 */

import { motion } from 'motion/react';
import { AlertCircle, RefreshCw, Info } from 'lucide-react';
import { handleGeminiError, GeminiErrorInfo } from '../lib/gemini-error-handler';

interface GeminiErrorDisplayProps {
  error: any;
  isRetrying?: boolean;
  currentAttempt?: number;
  maxAttempts?: number;
  onRetry?: () => void;
}

export function GeminiErrorDisplay({
  error,
  isRetrying = false,
  currentAttempt = 0,
  maxAttempts = 5,
  onRetry,
}: GeminiErrorDisplayProps) {
  if (!error) return null;

  const errorInfo: GeminiErrorInfo = handleGeminiError(error);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-5 border ${
        errorInfo.retryable
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {isRetrying ? (
          <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              errorInfo.retryable ? 'text-yellow-400' : 'text-red-400'
            }`}
          />
        )}
        <div className="flex-1">
          <h4
            className={`mb-1 ${
              errorInfo.retryable ? 'text-yellow-400' : 'text-red-400'
            }`}
          >
            {isRetrying ? 'Retrying...' : errorInfo.userMessage}
          </h4>
          <p className="text-white/70 text-sm">{errorInfo.suggestedAction}</p>
        </div>
      </div>

      {/* Retry Progress */}
      {isRetrying && errorInfo.retryable && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-yellow-400/80 mb-2">
            <span>Retry Progress</span>
            <span>
              Attempt {currentAttempt}/{maxAttempts}
            </span>
          </div>
          <div className="h-2 bg-yellow-900/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentAttempt / maxAttempts) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
            />
          </div>
          <p className="text-yellow-400/60 text-xs mt-2">
            ⏳ Waiting for service to become available...
          </p>
        </div>
      )}

      {/* Manual Retry Button */}
      {!isRetrying && errorInfo.retryable && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 w-full px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Now
        </button>
      )}

      {/* Info Section */}
      {!errorInfo.retryable && (
        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-white/60">
              <p className="text-cyan-400 mb-1">What to do:</p>
              <p>{errorInfo.suggestedAction}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
