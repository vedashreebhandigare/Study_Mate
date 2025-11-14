/**
 * Retry Indicator - Shows retry progress for API calls
 */

import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface RetryIndicatorProps {
  isRetrying: boolean;
  currentAttempt: number;
  maxAttempts: number;
  errorMessage?: string;
}

export function RetryIndicator({
  isRetrying,
  currentAttempt,
  maxAttempts,
  errorMessage,
}: RetryIndicatorProps) {
  if (!isRetrying) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
      >
        <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400">Retrying API request...</span>
            <span className="text-yellow-400/60 text-sm">
              Attempt {currentAttempt}/{maxAttempts}
            </span>
          </div>
          {errorMessage && (
            <div className="flex items-center gap-2 text-sm text-yellow-400/80">
              <AlertCircle className="w-3 h-3" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="mt-2 h-1 bg-yellow-900/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentAttempt / maxAttempts) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-yellow-400"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
