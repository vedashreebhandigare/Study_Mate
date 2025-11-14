import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { DashboardCard } from "./DashboardCard";
import { DocumentUploader } from "./DocumentUploader";
import { QuizConfigurator } from "./QuizConfigurator";
import { GlassButton } from "./GlassButton";
import { QuizTaker } from "./QuizTaker";
import { FlashcardGeneratorAdvanced } from "./FlashcardGeneratorAdvanced";
import { FlashcardClusterView } from "./FlashcardClusterView";
import { FlashcardDebugger } from "./FlashcardDebugger";
import { DatabaseDiagnostic } from "./DatabaseDiagnostic";
import { AITutorCard } from "./AITutorCard";
import { ConceptMapCard } from "./ConceptMapCard";
import { RoadmapCard } from "./RoadmapCard";
import { QuizGenerationResult } from "../lib/quiz-generator-advanced";
import { getUserFlashcards, getUserDocuments, Flashcard } from "../lib/database";
import {
  FileText,
  Brain,
  Sparkles,
  Upload,
  BookOpen,
  TrendingUp,
  Award,
  X,
  Play,
  CheckCircle,
  RefreshCw,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { ensureUserProfile } from "../lib/profile-utils";

export function Dashboard() {
  const [userName, setUserName] = useState<string>("there");
  const [userId, setUserId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizGenerationResult | null>(null);
  const [quizDocumentId, setQuizDocumentId] = useState<string>(''); // Track which document the quiz is for
  const [showQuizTaker, setShowQuizTaker] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [selectedFlashcardDocument, setSelectedFlashcardDocument] = useState<string>(''); // Track selected document for flashcards

  // Helper function to reload flashcards (filtered by selected document)
  const reloadFlashcards = async (documentId?: string) => {
    console.log('🔄 Reloading flashcards...', documentId ? `for document: ${documentId}` : 'all documents');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await getUserFlashcards(user.id, documentId);
      console.log('✅ Flashcards reloaded:', data?.length || 0, 'cards');
      if (error) {
        console.error('❌ Error reloading flashcards:', error);
      }
      if (data) {
        setFlashcards(data);
      } else {
        setFlashcards([]);
      }
    }
  };

  // Helper function to load all user documents for dropdowns
  const loadUserDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await getUserDocuments(user.id);
      if (data && !error) {
        console.log('📄 Loaded', data.length, 'documents');
        const docs = data.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content || ''
        }));
        setUploadedDocuments(docs);
        
        // Auto-select first document if none selected
        if (docs.length > 0 && !selectedFlashcardDocument) {
          console.log('🎯 Auto-selecting first document:', docs[0].title);
          setSelectedFlashcardDocument(docs[0].id);
        }
      }
    }
  };

  useEffect(() => {
    // Get user data
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
        setUserName(name);
        setUserId(user.id);
        
        // Ensure user profile exists in database
        await ensureUserProfile(user.id);
      }
    };
    fetchUser();
    
    // Check if documents exist to unlock features
    checkDocumentsExist();
    
    // Load documents on mount for roadmap and other features
    loadUserDocuments();
  }, []);

  // Refresh dashboard data when returning from Flask app with ?refresh=true
  useEffect(() => {
    if (window.location.search.includes('refresh=true')) {
      console.log('🔄 Refreshing dashboard data...');
      checkDocumentsExist();
      loadUserDocuments();
      if (selectedFlashcardDocument) {
        reloadFlashcards(selectedFlashcardDocument);
      }
      // Remove query param from URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // Check if any documents exist
  const checkDocumentsExist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setIsContentReady(true);
        console.log('📄 Documents exist, features unlocked');
      } else {
        setIsContentReady(false);
        console.log('📄 No documents found, features locked');
      }
    }
  };

  // Load flashcards when flashcards section is active or when document selection changes
  useEffect(() => {
    if (activeSection === 'flashcards') {
      // Load documents list if not already loaded
      if (uploadedDocuments.length === 0) {
        loadUserDocuments();
      }
      reloadFlashcards(selectedFlashcardDocument || undefined);
    }
  }, [activeSection, selectedFlashcardDocument]);

  const stats = [
    { label: "Documents Analyzed", value: "24", icon: FileText, color: "from-purple-500 to-pink-500" },
    { label: "Quizzes Completed", value: "12", icon: Award, color: "from-blue-500 to-cyan-500" },
    { label: "Study Streak", value: "7 days", icon: TrendingUp, color: "from-violet-500 to-purple-500" },
    { label: "AI Sessions", value: "36", icon: MessageSquare, color: "from-cyan-500 to-blue-500" },
  ];

  const handleCloseModal = () => {
    setActiveSection(null);
    setShowQuizTaker(false);
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-blue-200">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-xl text-white/60">
            Continue your learning journey where you left off
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="glass-panel rounded-2xl p-6 relative overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`}
              />
              <div className="relative z-10">
                <stat.icon className="w-8 h-8 text-white/60 mb-3" />
                <p className="text-3xl text-white mb-1">{stat.value}</p>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          <DashboardCard
            icon={Upload}
            title="Documents"
            description="Upload and analyze your study materials"
            gradient="from-purple-500 to-pink-500"
            onClick={() => setActiveSection("documents")}
            delay={0.1}
          >
            <GlassButton variant="ghost" size="sm">
              Upload Now
            </GlassButton>
          </DashboardCard>

          <DashboardCard
            icon={Brain}
            title="Quizzes"
            description={
              generatedQuiz 
                ? `Quiz ready: ${generatedQuiz.questions.length} questions • ${generatedQuiz.validation.score}% quality`
                : isContentReady
                  ? "Ready to create your first AI quiz!"
                  : "Test your knowledge with AI-generated quizzes"
            }
            gradient="from-blue-500 to-cyan-500"
            onClick={() => setActiveSection("quiz")}
            delay={0.2}
            disabled={!isContentReady}
          >
            <GlassButton variant="ghost" size="sm" disabled={!isContentReady}>
              {generatedQuiz ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Start Quiz
                </>
              ) : isContentReady ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Configure Quiz
                </>
              ) : (
                "No Quiz Yet"
              )}
            </GlassButton>
          </DashboardCard>

          <DashboardCard
            icon={BookOpen}
            title="Flashcards"
            description="Review key concepts with smart flashcards"
            gradient="from-violet-500 to-purple-500"
            onClick={() => setActiveSection("flashcards")}
            delay={0.3}
            disabled={!isContentReady}
          >
            <GlassButton variant="ghost" size="sm" disabled={!isContentReady}>
              Study Now
            </GlassButton>
          </DashboardCard>

          {/* AI Tutor Card */}
          {userId && <AITutorCard userId={userId} />}

          {/* Concept Map Card */}
          {userId && <ConceptMapCard userId={userId} />}

          {/* Adaptive Roadmap Card */}
          {userId && (
            <RoadmapCard 
              selectedDocumentId={selectedFlashcardDocument || null} 
              selectedDocumentName={uploadedDocuments.find(d => d.id === selectedFlashcardDocument)?.title || null}
            />
          )}
        </div>

        {/* Active Section Modal */}
        <AnimatePresence>
          {activeSection && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleCloseModal}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              {/* Modal Content */}
              <motion.div
                className="relative w-full max-w-4xl max-h-[80vh] glass-panel-strong rounded-3xl p-8 overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                {/* Close Button */}
                <motion.button
                  onClick={handleCloseModal}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-6 h-6 text-white" />
                </motion.button>

                {/* Documents Section - Upload Only */}
                {activeSection === "documents" && (
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl text-white">My Documents</h2>
                        <p className="text-white/60">Upload and manage your study materials</p>
                      </div>
                    </div>
                    <DocumentUploader 
                      onDocumentUploaded={(doc) => {
                        console.log('✅ Document uploaded:', doc.title);
                        // Track for flashcard generation
                        setUploadedDocuments(prev => {
                          const exists = prev.find(d => d.id === doc.id);
                          if (exists) return prev;
                          return [...prev, { id: doc.id, title: doc.title, content: doc.content }];
                        });
                      }}
                      onDocumentsChanged={() => {
                        // Recheck if documents exist to unlock features
                        checkDocumentsExist();
                      }}
                    />
                  </div>
                )}

                {/* Quiz Section */}
                {activeSection === "quiz" && (
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl text-white">AI-Powered Quizzes</h2>
                        <p className="text-white/60">
                          {!generatedQuiz && !showQuizTaker && "Generate quizzes from your documents"}
                          {generatedQuiz && !showQuizTaker && "Quiz ready to take"}
                          {showQuizTaker && "Take your quiz"}
                        </p>
                      </div>
                    </div>

                    {/* Show Quiz Taker if quiz is being taken */}
                    {showQuizTaker && generatedQuiz ? (
                      <QuizTaker 
                        quizResult={generatedQuiz}
                        documentId={quizDocumentId}
                        onBack={() => setShowQuizTaker(false)}
                      />
                    ) : generatedQuiz ? (
                      /* Show generated quiz preview with options */
                      <div className="space-y-6">
                        <div className="glass-panel rounded-2xl p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                              <Award className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl text-white mb-2">Your Quiz is Ready!</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-white/60">Questions</p>
                                  <p className="text-white">{generatedQuiz.questions.length}</p>
                                </div>
                                <div>
                                  <p className="text-white/60">Quality Score</p>
                                  <p className="text-white">{generatedQuiz.validation.score}%</p>
                                </div>
                                <div>
                                  <p className="text-white/60">Difficulty</p>
                                  <p className="text-white capitalize">{generatedQuiz.metadata.difficulty}</p>
                                </div>
                                <div>
                                  <p className="text-white/60">Est. Time</p>
                                  <p className="text-white">~{generatedQuiz.questions.length * 1.5} min</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Primary Action */}
                        <GlassButton onClick={() => setShowQuizTaker(true)} className="w-full" size="lg">
                          <Play className="w-5 h-5 mr-2" />
                          Start Quiz
                        </GlassButton>

                        {/* Secondary Actions */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              console.log('Generate new quiz - reset to configurator');
                              setGeneratedQuiz(null);
                            }}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Generate New Quiz
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this quiz? This cannot be undone.')) {
                                setGeneratedQuiz(null);
                              }
                            }}
                            className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                            title="Delete quiz"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* No quiz - Show configurator */
                      <QuizConfigurator 
                        onQuizGenerated={(result, documentId) => {
                          console.log('✅ Quiz generated!', result);
                          setGeneratedQuiz(result);
                          setQuizDocumentId(documentId);
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Flashcards Section */}
                {activeSection === "flashcards" && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl text-white">Smart Flashcards</h2>
                        <p className="text-white/60">
                          {selectedFlashcardDocument 
                            ? `📄 ${uploadedDocuments.find(d => d.id === selectedFlashcardDocument)?.title || 'Selected Document'}`
                            : 'All Documents'}
                        </p>
                      </div>
                    </div>

                    {/* Document Selector */}
                    <div className="mb-6">
                      <label className="block text-sm mb-2 text-white/80">
                        📄 Filter by Document
                      </label>
                      <select
                        value={selectedFlashcardDocument}
                        onChange={(e) => setSelectedFlashcardDocument(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl glass-panel border border-white/10 text-white bg-white/5 hover:bg-white/10 transition-colors focus:outline-none focus:border-purple-500/50"
                      >
                        <option value="" className="bg-slate-900 text-white">All Documents</option>
                        {uploadedDocuments.map((doc) => (
                          <option key={doc.id} value={doc.id} className="bg-slate-900 text-white">
                            {doc.title}
                          </option>
                        ))}
                      </select>
                      {selectedFlashcardDocument && (
                        <p className="mt-2 text-xs text-cyan-400">
                          ✓ Filtered to show only flashcards from this document
                        </p>
                      )}
                    </div>

                    {/* Status info */}
                    <div className="mb-6 p-4 glass-panel rounded-xl border border-cyan-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm mb-1">
                            📚 {flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''} loaded
                          </p>
                          <p className="text-white/60 text-xs">
                            {selectedFlashcardDocument 
                              ? `From: ${uploadedDocuments.find(d => d.id === selectedFlashcardDocument)?.title || 'Selected Document'}`
                              : 'Showing all documents'}
                          </p>
                        </div>
                        <button
                          onClick={() => reloadFlashcards(selectedFlashcardDocument || undefined)}
                          className="px-3 py-2 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reload
                        </button>
                      </div>
                    </div>

                    {flashcards.length === 0 ? (
                      // Generator view when no flashcards
                      <FlashcardGeneratorAdvanced
                        onGenerated={(documentId) => {
                          // Set the selected document to the one we just generated flashcards for
                          setSelectedFlashcardDocument(documentId);
                          // Reload flashcards filtered by this document
                          reloadFlashcards(documentId);
                        }}
                        uploadedDocuments={uploadedDocuments}
                      />
                    ) : (
                      // Show flashcards with option to generate more
                      <div>
                        <div className="mb-6 flex gap-4">
                          <GlassButton
                            onClick={() => setFlashcards([])}
                            icon={Sparkles}
                          >
                            Generate More Flashcards
                          </GlassButton>
                        </div>
                        <FlashcardClusterView flashcards={flashcards} />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Flashcard Debugger */}
      <FlashcardDebugger />
      
      {/* Database Diagnostic */}
      <DatabaseDiagnostic />
    </div>
  );
}
