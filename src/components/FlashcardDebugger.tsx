/**
 * Flashcard Debugger - Helps diagnose flashcard database issues
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserFlashcards } from '../lib/database';
import { motion } from 'motion/react';
import { Bug, Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export function FlashcardDebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runDiagnostics = async () => {
    setIsChecking(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      user: null,
      flashcardsCount: 0,
      flashcards: [],
      schemaCheck: null,
      errors: [],
    };

    try {
      // Check user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        info.errors.push(`User error: ${userError.message}`);
      } else {
        info.user = { id: user?.id, email: user?.email };
      }

      // Check flashcards
      if (user) {
        const { data, error } = await getUserFlashcards(user.id);
        if (error) {
          info.errors.push(`Flashcards error: ${JSON.stringify(error)}`);
        } else {
          info.flashcardsCount = data?.length || 0;
          info.flashcards = data?.map(f => ({
            id: f.id,
            deck_name: f.deck_name,
            cluster: f.cluster,
            has_cluster: !!f.cluster,
            has_source: !!f.source,
            has_visualization: !!f.visualization,
            difficulty_level: f.difficulty_level,
          })) || [];
        }

        // Check table schema
        try {
          const { data: schemaData, error: schemaError } = await supabase
            .from('flashcards')
            .select('*')
            .limit(1);

          if (schemaError) {
            info.errors.push(`Schema check error: ${schemaError.message}`);
          } else {
            info.schemaCheck = {
              hasData: !!schemaData && schemaData.length > 0,
              sampleColumns: schemaData && schemaData.length > 0 ? Object.keys(schemaData[0]) : [],
            };
          }
        } catch (err) {
          info.errors.push(`Schema check failed: ${err}`);
        }
      }
    } catch (err) {
      info.errors.push(`General error: ${err}`);
    }

    setDebugInfo(info);
    setIsChecking(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          runDiagnostics();
        }}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 transition-all z-50"
        title="Flashcard Debugger"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 w-96 glass-panel-strong rounded-2xl p-6 z-50 max-h-[80vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-orange-400" />
          <h3 className="text-white">Flashcard Debugger</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/60 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Refresh Button */}
      <button
        onClick={runDiagnostics}
        disabled={isChecking}
        className="w-full mb-4 px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? 'Checking...' : 'Run Diagnostics'}
      </button>

      {/* Debug Info */}
      {debugInfo && (
        <div className="space-y-4 text-sm">
          {/* User Info */}
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {debugInfo.user ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-white">User</span>
            </div>
            <pre className="text-white/60 text-xs overflow-x-auto">
              {JSON.stringify(debugInfo.user, null, 2)}
            </pre>
          </div>

          {/* Flashcards Count */}
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {debugInfo.flashcardsCount > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              )}
              <span className="text-white">Flashcards</span>
            </div>
            <p className="text-white/80">Count: {debugInfo.flashcardsCount}</p>
          </div>

          {/* Flashcard Details */}
          {debugInfo.flashcards.length > 0 && (
            <div className="glass-panel rounded-lg p-3">
              <span className="text-white mb-2 block">Sample Flashcards</span>
              <pre className="text-white/60 text-xs overflow-x-auto max-h-40">
                {JSON.stringify(debugInfo.flashcards.slice(0, 3), null, 2)}
              </pre>
            </div>
          )}

          {/* Schema Check */}
          {debugInfo.schemaCheck && (
            <div className="glass-panel rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-white">Schema</span>
              </div>
              <pre className="text-white/60 text-xs overflow-x-auto">
                {JSON.stringify(debugInfo.schemaCheck, null, 2)}
              </pre>
            </div>
          )}

          {/* Errors */}
          {debugInfo.errors.length > 0 && (
            <div className="glass-panel rounded-lg p-3 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400">Errors</span>
              </div>
              <div className="space-y-1">
                {debugInfo.errors.map((err: string, i: number) => (
                  <p key={i} className="text-red-400/80 text-xs">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-white/40 text-xs text-center">
            Last checked: {new Date(debugInfo.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </motion.div>
  );
}
