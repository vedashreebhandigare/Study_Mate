/**
 * Quiz Taker Component
 * Take quiz and show results with premium UI
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QuizGenerationResult } from '../lib/quiz-generator-advanced';
import { QuizValidator } from '../lib/quiz-validator';
import { GlassButton } from './GlassButton';
import { QuizMetrics } from './QuizMetrics';
import { CheckCircle, XCircle, Award, TrendingUp, Clock, Target, ArrowLeft, Play, Link2 } from 'lucide-react';
import { updateConceptMastery, updateConceptChainMastery } from '../lib/database';
import { supabase } from '../lib/supabase';

interface QuizTakerProps {
  quizResult: QuizGenerationResult;
  documentId?: string;
  onBack: () => void;
}

interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
}

export function QuizTaker({ quizResult, documentId, onBack }: QuizTakerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  const { questions, contentAnalysis, validation } = quizResult;

  // Track concept mastery when results are shown
  useEffect(() => {
    if (showResults && documentId) {
      trackConceptMastery();
    }
  }, [showResults]);

  const trackConceptMastery = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !documentId) return;

      // Track each question's concept
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answer = answers.find(a => a.questionIndex === i);
        if (!answer) continue;

        // ✅ MULTI-HOP ENHANCEMENT: Detect and track multi-hop questions
        const isMultiHop = question.question.startsWith('[Multi-Hop]');
        
        if (isMultiHop) {
          // Extract concept chain from explanation
          const conceptChain = extractConceptChain(question.explanation);
          
          if (conceptChain.length >= 2) {
            console.log(`🔗 Tracking multi-hop question: ${conceptChain.join(' → ')}`);
            
            // Update relationship mastery for concept chain
            await updateConceptChainMastery(
              user.id,
              conceptChain,
              answer.isCorrect,
              documentId
            );
          }
        } else {
          // Regular concept mastery tracking (existing logic)
          const conceptName = extractConceptFromQuestion(question.question);
          const conceptId = `quiz-${conceptName.toLowerCase().replace(/\s+/g, '-').slice(0, 50)}`;

          await updateConceptMastery(
            user.id,
            documentId,
            conceptId,
            conceptName,
            answer.isCorrect
          );
        }
      }
    } catch (error) {
      console.error('Error tracking concept mastery:', error);
    }
  };

  // ✅ NEW: Extract concept chain from multi-hop explanation
  const extractConceptChain = (explanation: string): string[] => {
    // Look for "Concept Chain: A → B → C" pattern
    const chainMatch = explanation.match(/Concept Chain:\s*([^\n]+)/i);
    
    if (chainMatch) {
      const chainText = chainMatch[1];
      // Split by arrow and clean up
      return chainText
        .split(/→|->/)
        .map(concept => concept.trim())
        .filter(concept => concept.length > 0);
    }
    
    return [];
  };

  // ✅ NEW: Extract meaningful concept name from question text
  const extractConceptFromQuestion = (questionText: string): string => {
    // Remove question mark and common question words
    let cleaned = questionText
      .replace(/\?/g, '')
      .toLowerCase()
      .trim();
    
    // Common question starters to remove
    const questionStarters = [
      'what', 'which', 'how', 'why', 'when', 'where', 'who',
      'does', 'is', 'are', 'can', 'could', 'would', 'should',
      'the', 'a', 'an', 'this', 'that', 'these', 'those'
    ];
    
    const words = cleaned.split(/\s+/);
    
    // Skip question words at the start
    let startIndex = 0;
    while (startIndex < words.length && questionStarters.includes(words[startIndex])) {
      startIndex++;
    }
    
    // Take next 4-6 meaningful words as concept
    const conceptWords = words.slice(startIndex, startIndex + 6);
    
    // Capitalize first letter of each word for readability
    const concept = conceptWords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return concept || 'General Concept';
  };

  const handleStart = () => {
    setIsStarted(true);
    setStartTime(Date.now());
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const handleNextQuestion = () => {
    if (selectedOption === null) return;

    const isCorrect = selectedOption === questions[currentQuestion].correctAnswer;
    const newAnswer: QuizAnswer = {
      questionIndex: currentQuestion,
      selectedAnswer: selectedOption,
      isCorrect,
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setEndTime(Date.now());
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    const correct = answers.filter(a => a.isCorrect).length;
    return Math.round((correct / questions.length) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 75) return 'from-blue-500 to-cyan-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent! 🎉';
    if (score >= 75) return 'Great Job! 👍';
    if (score >= 60) return 'Good Effort! 💪';
    return 'Keep Practicing! 📚';
  };

  // Quiz Overview Screen
  if (!isStarted) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* ✅ Enhanced Metrics Display */}
        <QuizMetrics result={quizResult} />

        {/* ✅ NEW: Quality Score Card (Trust Badge) */}
        {validation.qualityCard && (
          <motion.div
            className="glass-panel rounded-2xl p-6 border-2 border-purple-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-white">
                <Award className="w-5 h-5 text-yellow-400" />
                Quiz Quality Score
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {validation.qualityCard.overallScore}/100
                </span>
              </div>
            </div>

            {/* Badges */}
            {validation.qualityCard.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {validation.qualityCard.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm"
                  >
                    ✓ {badge}
                  </span>
                ))}
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="glass-panel rounded-lg p-3">
                <p className="text-white/60 text-xs mb-1">Position Balance</p>
                <div className="flex gap-1 text-xs text-white/80">
                  <span>A:{validation.qualityCard.positionBalance.A}%</span>
                  <span>B:{validation.qualityCard.positionBalance.B}%</span>
                  <span>C:{validation.qualityCard.positionBalance.C}%</span>
                  <span>D:{validation.qualityCard.positionBalance.D}%</span>
                </div>
              </div>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-white/60 text-xs mb-1">Length Balance</p>
                <p className="text-white font-semibold">{validation.qualityCard.lengthBalance}%</p>
              </div>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-white/60 text-xs mb-1">Biased Phrasing</p>
                <p className="text-white font-semibold">
                  {validation.qualityCard.biasedPhrasing === 0 ? '✓ None' : validation.qualityCard.biasedPhrasing}
                </p>
              </div>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-white/60 text-xs mb-1">Cognitive Level</p>
                <p className="text-white font-semibold">{validation.qualityCard.cognitiveAlignment}%</p>
              </div>
            </div>

            <p className="text-xs text-white/40 mt-4 text-center italic">
              {validation.qualityCard.overallScore >= 90 
                ? '"This quiz is high-quality—I\'ll take it seriously"' 
                : '"Generated with AI-powered quality checks"'}
            </p>
          </motion.div>
        )}

        <motion.div
          className="glass-panel-strong rounded-3xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Award className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl text-white mb-2">Quiz Ready!</h2>
            <p className="text-white/60">Test your knowledge with AI-generated questions</p>
          </div>

          {/* Quiz Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-panel rounded-2xl p-4 text-center">
              <Target className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl text-white mb-1">{questions.length}</p>
              <p className="text-white/60 text-sm">Questions</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 text-center">
              <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl text-white mb-1">~{questions.length * 1.5}</p>
              <p className="text-white/60 text-sm">Minutes</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 text-center">
              <TrendingUp className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl text-white mb-1">{validation.score}%</p>
              <p className="text-white/60 text-sm">Quality</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 text-center">
              <Award className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <p className="text-2xl text-white mb-1 capitalize">{quizResult.metadata.difficulty}</p>
              <p className="text-white/60 text-sm">Level</p>
            </div>
          </div>

          {/* Content Info */}
          <div className="glass-panel rounded-2xl p-6 mb-6">
            <h3 className="text-white mb-3">Content Overview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/60">Word Count</p>
                <p className="text-white">{contentAnalysis.wordCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/60">Complexity</p>
                <p className="text-white capitalize">{contentAnalysis.complexity}</p>
              </div>
            </div>
          </div>

          <GlassButton onClick={handleStart} className="w-full">
            <Play className="w-5 h-5 mr-2" />
            Start Quiz
          </GlassButton>
        </motion.div>
      </div>
    );
  }

  // Results Screen
  if (showResults) {
    const score = calculateScore();
    const correctCount = answers.filter(a => a.isCorrect).length;
    const timeTaken = Math.round((endTime - startTime) / 1000);

    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <motion.div
          className="glass-panel-strong rounded-3xl p-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Score Display */}
          <div className="text-center mb-8">
            <motion.div
              className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br ${getScoreColor(score)} flex items-center justify-center`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <div className="text-center">
                <p className="text-4xl text-white">{score}%</p>
              </div>
            </motion.div>
            <h2 className="text-3xl text-white mb-2">{getScoreLabel(score)}</h2>
            <p className="text-white/60">
              You got {correctCount} out of {questions.length} questions correct
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="glass-panel rounded-2xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl text-white mb-1">{correctCount}</p>
              <p className="text-white/60 text-sm">Correct</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 text-center">
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-2xl text-white mb-1">{questions.length - correctCount}</p>
              <p className="text-white/60 text-sm">Incorrect</p>
            </div>
            <div className="glass-panel rounded-2xl p-4 text-center">
              <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl text-white mb-1">{timeTaken}s</p>
              <p className="text-white/60 text-sm">Time</p>
            </div>
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="text-xl text-white mb-4">Review Answers</h3>
            {questions.map((question, index) => {
              const answer = answers.find(a => a.questionIndex === index);
              const isCorrect = answer?.isCorrect ?? false;

              return (
                <motion.div
                  key={index}
                  className={`glass-panel rounded-2xl p-6 border ${
                    isCorrect ? 'border-green-500/30' : 'border-red-500/30'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <p className="text-white mb-3">{question.question}</p>
                      
                      {/* Show selected answer */}
                      {answer && (
                        <div className="space-y-2 mb-3">
                          <p className="text-sm text-white/60">Your answer:</p>
                          <div className={`p-3 rounded-xl ${
                            isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            <p className="text-white text-sm">{question.options[answer.selectedAnswer]}</p>
                          </div>
                        </div>
                      )}

                      {/* Show correct answer if wrong */}
                      {!isCorrect && (
                        <div className="space-y-2 mb-3">
                          <p className="text-sm text-white/60">Correct answer:</p>
                          <div className="p-3 rounded-xl bg-green-500/20">
                            <p className="text-white text-sm">{question.options[question.correctAnswer]}</p>
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="p-3 rounded-xl bg-white/5 mt-3">
                        <p className="text-white/80 text-sm">{question.explanation}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // Quiz Taking Screen
  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  
  // ✅ MULTI-HOP ENHANCEMENT: Detect multi-hop questions
  const isMultiHop = currentQ.question.startsWith('[Multi-Hop]');
  const displayQuestion = isMultiHop 
    ? currentQ.question.replace('[Multi-Hop]', '').trim()
    : currentQ.question;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/60 text-sm">
            Question {currentQuestion + 1} of {questions.length}
          </p>
          <div className="flex items-center gap-2">
            {isMultiHop && (
              <span className="px-2 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                Multi-Hop
              </span>
            )}
            <p className="text-white/60 text-sm capitalize">
              {currentQ.difficulty}
            </p>
          </div>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          className="glass-panel-strong rounded-3xl p-8"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          {/* Multi-Hop Badge (if applicable) */}
          {isMultiHop && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-300 text-sm">
                <Link2 className="w-4 h-4" />
                <span>This question requires understanding relationships across multiple concepts</span>
              </div>
            </div>
          )}

          <h3 className="text-2xl text-white mb-8">{displayQuestion}</h3>

          <div className="space-y-3 mb-8">
            {currentQ.options.map((option, index) => (
              <motion.button
                key={index}
                className={`w-full glass-panel rounded-2xl p-6 text-left transition-all ${
                  selectedOption === index
                    ? 'ring-2 ring-purple-500 bg-purple-500/20'
                    : 'hover:bg-white/5'
                }`}
                onClick={() => handleSelectOption(index)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedOption === index
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-white/30'
                    }`}
                  >
                    {selectedOption === index && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-white rounded-full"
                      />
                    )}
                  </div>
                  <p className="text-white">{option}</p>
                </div>
              </motion.button>
            ))}
          </div>

          <GlassButton
            onClick={handleNextQuestion}
            disabled={selectedOption === null}
            className="w-full"
          >
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </GlassButton>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
