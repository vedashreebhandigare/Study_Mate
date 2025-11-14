/**
 * Database Diagnostic Tool - Tests flashcard insertion
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { createFlashcard } from '../lib/database';
import { motion } from 'motion/react';
import { Database, TestTube, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function DatabaseDiagnostic() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTest = async () => {
    setIsTesting(true);
    const testResults: any = {
      step1_auth: { status: 'pending', message: '', data: null },
      step2_tableExists: { status: 'pending', message: '', data: null },
      step3_insertMinimal: { status: 'pending', message: '', data: null },
      step4_insertEnhanced: { status: 'pending', message: '', data: null },
      step5_query: { status: 'pending', message: '', data: null },
    };

    try {
      // Step 1: Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        testResults.step1_auth = {
          status: 'error',
          message: authError?.message || 'Not authenticated',
          data: null,
        };
        setResults(testResults);
        setIsTesting(false);
        return;
      }
      testResults.step1_auth = {
        status: 'success',
        message: `Authenticated as ${user.email}`,
        data: { userId: user.id, email: user.email },
      };
      setResults({ ...testResults });

      // Step 2: Check if table exists
      const { data: tableData, error: tableError } = await supabase
        .from('flashcards')
        .select('*')
        .limit(0);
      
      if (tableError) {
        testResults.step2_tableExists = {
          status: 'error',
          message: tableError.message,
          data: tableError,
        };
        setResults({ ...testResults });
        setIsTesting(false);
        return;
      }
      testResults.step2_tableExists = {
        status: 'success',
        message: 'Table exists',
        data: null,
      };
      setResults({ ...testResults });

      // Step 3: Try inserting minimal flashcard (only required fields)
      const minimalCard = {
        user_id: user.id,
        deck_name: 'TEST_DECK_' + Date.now(),
        front: 'Test question',
        back: 'Test answer',
      };

      const { data: insertData1, error: insertError1 } = await supabase
        .from('flashcards')
        .insert([minimalCard])
        .select();

      if (insertError1) {
        testResults.step3_insertMinimal = {
          status: 'error',
          message: insertError1.message,
          data: insertError1,
        };
        setResults({ ...testResults });
        setIsTesting(false);
        return;
      }
      testResults.step3_insertMinimal = {
        status: 'success',
        message: 'Minimal insert succeeded',
        data: insertData1,
      };
      setResults({ ...testResults });

      // Step 4: Try inserting enhanced flashcard (with new fields)
      const enhancedCard = {
        user_id: user.id,
        deck_name: 'TEST_DECK_ENHANCED_' + Date.now(),
        front: 'Enhanced test question',
        back: 'Enhanced test answer',
        cluster: 'Critical Thinking',
        source: 'Test source',
        difficulty_level: 'graduate',
        tags: ['test', 'diagnostic'],
        visualization: {
          type: 'bar_chart',
          description: 'Test visualization',
          caption: 'Test caption',
          annotations: ['A', 'B'],
          icon: 'BarChart3',
        },
      };

      const { data: insertData2, error: insertError2 } = await supabase
        .from('flashcards')
        .insert([enhancedCard])
        .select();

      if (insertError2) {
        testResults.step4_insertEnhanced = {
          status: 'error',
          message: insertError2.message,
          data: insertError2,
        };
        setResults({ ...testResults });
        setIsTesting(false);
        return;
      }
      testResults.step4_insertEnhanced = {
        status: 'success',
        message: 'Enhanced insert succeeded',
        data: insertData2,
      };
      setResults({ ...testResults });

      // Step 5: Query back all test flashcards
      const { data: queryData, error: queryError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .or(`deck_name.like.TEST_DECK_%`);

      if (queryError) {
        testResults.step5_query = {
          status: 'error',
          message: queryError.message,
          data: queryError,
        };
      } else {
        testResults.step5_query = {
          status: 'success',
          message: `Found ${queryData.length} test flashcards`,
          data: queryData,
        };
      }

      setResults({ ...testResults });
      toast.success('Diagnostic complete!');
    } catch (err) {
      toast.error('Diagnostic failed: ' + (err as Error).message);
      console.error('Diagnostic error:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const cleanupTestData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('user_id', user.id)
      .or(`deck_name.like.TEST_DECK_%`);

    if (error) {
      toast.error('Cleanup failed: ' + error.message);
    } else {
      toast.success('Test data cleaned up');
      setResults(null);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          runTest();
        }}
        className="fixed bottom-20 right-6 p-3 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all z-50"
        title="Database Diagnostic"
      >
        <TestTube className="w-5 h-5" />
      </button>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 right-6 w-[500px] glass-panel-strong rounded-2xl p-6 z-50 max-h-[70vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-green-400" />
          <h3 className="text-white">Database Diagnostic</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/60 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Test Button */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={runTest}
          disabled={isTesting}
          className="flex-1 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <TestTube className={`w-4 h-4 ${isTesting ? 'animate-pulse' : ''}`} />
          {isTesting ? 'Running Tests...' : 'Run Diagnostic'}
        </button>
        {results && (
          <button
            onClick={cleanupTestData}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            Cleanup
          </button>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-3 text-sm">
          {/* Step 1 */}
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(results.step1_auth.status)}
              <span className="text-white">Step 1: Authentication</span>
            </div>
            <p className={`text-xs ${results.step1_auth.status === 'error' ? 'text-red-400' : 'text-white/60'}`}>
              {results.step1_auth.message}
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(results.step2_tableExists.status)}
              <span className="text-white">Step 2: Table Exists</span>
            </div>
            <p className={`text-xs ${results.step2_tableExists.status === 'error' ? 'text-red-400' : 'text-white/60'}`}>
              {results.step2_tableExists.message}
            </p>
            {results.step2_tableExists.status === 'error' && (
              <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-400">
                <strong>Fix:</strong> Create the flashcards table in Supabase
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(results.step3_insertMinimal.status)}
              <span className="text-white">Step 3: Insert Minimal Card</span>
            </div>
            <p className={`text-xs ${results.step3_insertMinimal.status === 'error' ? 'text-red-400' : 'text-white/60'}`}>
              {results.step3_insertMinimal.message}
            </p>
            {results.step3_insertMinimal.data && (
              <pre className="mt-2 p-2 bg-white/5 rounded text-xs text-white/60 overflow-x-auto">
                {JSON.stringify(results.step3_insertMinimal.data, null, 2)}
              </pre>
            )}
          </div>

          {/* Step 4 */}
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(results.step4_insertEnhanced.status)}
              <span className="text-white">Step 4: Insert Enhanced Card</span>
            </div>
            <p className={`text-xs ${results.step4_insertEnhanced.status === 'error' ? 'text-red-400' : 'text-white/60'}`}>
              {results.step4_insertEnhanced.message}
            </p>
            {results.step4_insertEnhanced.status === 'error' && (
              <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-400">
                <strong>Missing columns!</strong> Run the ALTER TABLE migration
              </div>
            )}
          </div>

          {/* Step 5 */}
          <div className="glass-panel rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(results.step5_query.status)}
              <span className="text-white">Step 5: Query Test Data</span>
            </div>
            <p className={`text-xs ${results.step5_query.status === 'error' ? 'text-red-400' : 'text-white/60'}`}>
              {results.step5_query.message}
            </p>
            {results.step5_query.data && results.step5_query.data.length > 0 && (
              <pre className="mt-2 p-2 bg-white/5 rounded text-xs text-white/60 overflow-x-auto max-h-40">
                {JSON.stringify(results.step5_query.data.slice(0, 2), null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <p className="text-cyan-400 text-xs">
          This diagnostic tests if flashcards can be inserted into the database.
          It will create test flashcards and then clean them up.
        </p>
      </div>
    </motion.div>
  );
}
