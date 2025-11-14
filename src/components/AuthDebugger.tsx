/**
 * Auth Debugger - Shows authentication status and helps diagnose issues
 * Only visible in development
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Bug, CheckCircle, XCircle, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';

export function AuthDebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [authState, setAuthState] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Get initial session
    checkAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAuthState();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthState = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    
    setAuthState({
      hasSession: !!session,
      hasUser: !!user,
      session,
      user,
      error,
      timestamp: new Date().toISOString(),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Auth Debugger"
      >
        <Bug className="w-6 h-6 text-white" />
      </motion.button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed top-4 right-4 z-50 w-96 max-h-[90vh] overflow-auto glass-panel-strong rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white flex items-center gap-2">
                <Bug className="w-5 h-5 text-purple-400" />
                Auth Debugger
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Auth Status */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                {authState?.hasSession ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-white text-sm">
                  Session: {authState?.hasSession ? 'Active' : 'None'}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                {authState?.hasUser ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-white text-sm">
                  User: {authState?.hasUser ? 'Authenticated' : 'Not authenticated'}
                </span>
              </div>

              {authState?.user?.email && (
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-white/60 text-xs mb-1">Email</p>
                  <p className="text-white text-sm break-all">{authState.user.email}</p>
                </div>
              )}

              {authState?.user?.email_confirmed_at ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm">Email Confirmed</span>
                </div>
              ) : authState?.hasUser ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 text-sm">Email Not Confirmed</span>
                </div>
              ) : null}
            </div>

            {/* Error Display */}
            {authState?.error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-300 text-sm">{authState.error.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 mb-4">
              <button
                onClick={checkAuthState}
                className="w-full px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 transition-colors"
              >
                🔄 Refresh Status
              </button>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 text-white text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {/* Detailed Info */}
            {showDetails && authState && (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/60 text-xs">User Object</p>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(authState.user, null, 2))}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <pre className="text-white/80 text-xs overflow-auto max-h-40 bg-black/20 p-2 rounded">
                    {JSON.stringify(authState.user, null, 2)}
                  </pre>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/60 text-xs">Session Object</p>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(authState.session, null, 2))}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <pre className="text-white/80 text-xs overflow-auto max-h-40 bg-black/20 p-2 rounded">
                    {JSON.stringify(authState.session, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Helpful Tips */}
            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-blue-300 text-xs mb-2">💡 Troubleshooting Tips:</p>
              <ul className="text-blue-200/80 text-xs space-y-1 list-disc list-inside">
                <li>If "Email Not Confirmed", check your inbox</li>
                <li>Check Supabase Dashboard → Auth → Users</li>
                <li>Try disabling email confirmation</li>
                <li>Check browser console for errors</li>
              </ul>
            </div>

            {/* Timestamp */}
            <p className="text-white/40 text-xs text-center mt-3">
              Last check: {authState?.timestamp ? new Date(authState.timestamp).toLocaleTimeString() : 'N/A'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
