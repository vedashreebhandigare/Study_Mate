import { useState, useEffect } from 'react';
import { getRateLimitStatus } from '../lib/rate-limiter';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export function RateLimitIndicator() {
  const [status, setStatus] = useState(getRateLimitStatus());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newStatus = getRateLimitStatus();
      setStatus(newStatus);
      
      // Show indicator if queue is active or approaching limit
      const shouldShow = 
        newStatus.queueLength > 0 || 
        newStatus.isProcessing || 
        newStatus.requestsRemaining < 5;
      
      setIsVisible(shouldShow);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const getStatusColor = () => {
    if (status.requestsRemaining <= 3) return 'from-red-500 to-orange-500';
    if (status.requestsRemaining <= 8) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-emerald-500';
  };

  const getStatusIcon = () => {
    if (status.isProcessing) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (status.requestsRemaining <= 3) {
      return <AlertCircle className="w-4 h-4" />;
    }
    if (status.queueLength > 0) {
      return <Clock className="w-4 h-4" />;
    }
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (status.isProcessing && status.queueLength > 0) {
      return `Processing... ${status.queueLength} in queue`;
    }
    if (status.isProcessing) {
      return 'Processing request...';
    }
    if (status.queueLength > 0) {
      return `${status.queueLength} request${status.queueLength > 1 ? 's' : ''} queued`;
    }
    if (status.requestsRemaining <= 3) {
      return `Rate limit: ${status.requestsRemaining} requests left`;
    }
    return `${status.requestsRemaining} requests available`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="glass-panel-strong rounded-2xl px-4 py-3 border border-white/20 shadow-xl">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <motion.div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getStatusColor()} flex items-center justify-center`}
              animate={{
                scale: status.isProcessing ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 1,
                repeat: status.isProcessing ? Infinity : 0,
              }}
            >
              {getStatusIcon()}
            </motion.div>

            {/* Status Info */}
            <div className="flex-1">
              <p className="text-sm text-white">
                {getStatusText()}
              </p>
              {status.requestsRemaining <= 5 && (
                <p className="text-xs text-white/60 mt-0.5">
                  Resets in {Math.ceil(status.resetIn / 1000)}s
                </p>
              )}
            </div>

            {/* Progress Bar */}
            {status.requestsRemaining <= 10 && (
              <div className="w-20">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${getStatusColor()}`}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(status.requestsRemaining / 15) * 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Warning message if rate limit is very low */}
          {status.requestsRemaining <= 2 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 pt-3 border-t border-white/10"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-300">
                  Rate limit nearly reached. New requests will be automatically queued and delayed.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
