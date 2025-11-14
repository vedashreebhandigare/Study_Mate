/**
 * Concept Map Dashboard Card
 * 
 * Entry point card that opens the concept map viewer in a modal
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Network, Loader2, AlertCircle, X, Sparkles, Zap, Info } from "lucide-react";
import { GlassButton } from "./GlassButton";
import { ConceptMap } from "./ConceptMap";
import { ConceptMapSimple } from "./ConceptMapSimple";
import { ConceptMapSankey } from "./ConceptMapSankey";
import { ConceptMapCircular } from "./ConceptMapCircular";
import { ConceptMapTimeline } from "./ConceptMapTimeline";
import { ConceptMapHierarchical } from "./ConceptMapHierarchical";
import { ConceptMapRadial } from "./ConceptMapRadial";
import { ConceptMapGrid } from "./ConceptMapGrid";
import { ConceptMapMatrix } from "./ConceptMapMatrix";
import { ConceptMapCluster } from "./ConceptMapCluster";
import { generateConceptMap, ConceptMapData } from "../lib/concept-map-generator";
import { 
  getConceptMapByDocument, 
  createConceptMap, 
  updateConceptMap,
  getUserDocuments,
} from "../lib/database";
import { supabase } from "../lib/supabase";
import { getStoredDocumentText } from "../lib/storage";

interface ConceptMapCardProps {
  userId: string;
}

export function ConceptMapCard({ userId }: ConceptMapCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conceptMapData, setConceptMapData] = useState<ConceptMapData | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>("");
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [hasExistingMap, setHasExistingMap] = useState(false);
  const [useSimpleVersion, setUseSimpleVersion] = useState(true); // Use simple version by default (better performance)
  const [selectedLayout, setSelectedLayout] = useState<'force' | 'sankey' | 'circular' | 'timeline' | 'hierarchical' | 'radial' | 'grid' | 'matrix' | 'cluster'>('force');

  // Load available documents
  useEffect(() => {
    loadDocuments();
  }, [userId]);

  const loadDocuments = async () => {
    const { data, error } = await getUserDocuments(userId);
    if (data && !error) {
      setAvailableDocuments(data);
      if (data.length > 0 && !selectedDocumentId) {
        setSelectedDocumentId(data[0].id);
        setSelectedDocumentTitle(data[0].name);
      }
    }
  };

  // Check if concept map exists for selected document
  useEffect(() => {
    if (selectedDocumentId) {
      checkExistingMap(selectedDocumentId);
    }
  }, [selectedDocumentId]);

  const checkExistingMap = async (documentId: string) => {
    const { data } = await getConceptMapByDocument(userId, documentId);
    if (data) {
      setHasExistingMap(true);
      setConceptMapData({
        nodes: data.nodes,
        edges: data.edges,
      });
    } else {
      setHasExistingMap(false);
      setConceptMapData(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDocumentId) {
      setError("Please select a document first");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setRetryStatus(null);

    try {
      console.log("🗺️ Generating concept map for document:", selectedDocumentId);

      // Get document text from storage
      const documentText = await getStoredDocumentText(selectedDocumentId, userId);
      if (!documentText) {
        throw new Error("Could not retrieve document content");
      }

      // Show status while generating
      setRetryStatus("🧠 Analyzing document with AI...");
      
      // Generate concept map with Gemini (with automatic retry)
      const mapData = await generateConceptMap(documentText, selectedDocumentTitle);

      // Check if map already exists
      const { data: existingMap } = await getConceptMapByDocument(userId, selectedDocumentId);

      if (existingMap) {
        // Update existing map
        await updateConceptMap(existingMap.id, {
          nodes: mapData.nodes,
          edges: mapData.edges,
        });
        console.log("✅ Updated existing concept map");
      } else {
        // Create new map
        await createConceptMap({
          user_id: userId,
          document_id: selectedDocumentId,
          nodes: mapData.nodes,
          edges: mapData.edges,
        });
        console.log("✅ Created new concept map");
      }

      setConceptMapData(mapData);
      setHasExistingMap(true);
      setRetryStatus(null);
    } catch (err: any) {
      console.error("❌ Error generating concept map:", err);
      
      // Provide helpful error messages
      let errorMessage = "Failed to generate concept map";
      
      if (err.message?.includes("503") || err.message?.includes("overload") || err.message?.includes("high demand")) {
        errorMessage = "🔄 The AI service is currently experiencing high demand. Please wait 1-2 minutes and try again. This is a temporary issue.";
      } else if (err.message?.includes("429") || err.message?.includes("rate limit")) {
        errorMessage = "⏱️ Rate limit reached. Please wait 1-2 minutes before trying again.";
      } else if (err.message?.includes("Network error") || err.message?.includes("Failed to fetch")) {
        errorMessage = "🌐 Network error: Unable to connect to AI service. Please check your internet connection and try again.";
      } else if (err.message?.includes("Could not retrieve document content")) {
        errorMessage = "📄 Unable to retrieve document content. Please try re-uploading your document.";
      } else if (err.message?.includes("API key")) {
        errorMessage = "🔑 API configuration error. Please contact support.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setRetryStatus(null);
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDocumentChange = (documentId: string) => {
    const doc = availableDocuments.find((d) => d.id === documentId);
    if (doc) {
      setSelectedDocumentId(documentId);
      setSelectedDocumentTitle(doc.name);
    }
  };

  return (
    <>
      {/* Dashboard Card */}
      <motion.div
        className="group relative glass-panel rounded-3xl p-8 overflow-hidden cursor-pointer"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ y: -8 }}
        onClick={() => setIsOpen(true)}
      >
        {/* Gradient Background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-pink-500 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        />

        {/* Icon */}
        <motion.div
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center mb-6 relative"
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Network className="w-7 h-7 text-white" />
        </motion.div>

        {/* Content */}
        <h3 className="text-2xl mb-3 text-white">Interactive Knowledge Graph</h3>
        <p className="text-white/60 mb-6 leading-relaxed">
          Extract, classify, and explore key concepts from your research papers. 
          Hover for definitions, click to highlight relationships, search to focus.
        </p>

        <GlassButton variant="ghost" size="sm">
          {hasExistingMap ? "View Map" : "Generate Map"}
        </GlassButton>

        {/* Glow effect */}
        <motion.div
          className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500"
          style={{ background: "radial-gradient(circle, #EC4899 0%, transparent 70%)" }}
        />
      </motion.div>

      {/* Full-Screen Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Content */}
            <motion.div
              className="relative w-full h-full glass-panel-strong rounded-3xl overflow-hidden flex flex-col"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                    <Network className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl text-white">Interactive Knowledge Graph</h2>
                    <p className="text-white/60 text-sm">
                      {selectedDocumentTitle || "Research Paper Visualization"} • Hover nodes & edges for details • Click to highlight connections
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Layout Selector */}
                  {conceptMapData && (
                    <select
                      value={selectedLayout}
                      onChange={(e) => setSelectedLayout(e.target.value as any)}
                      className="px-4 py-2 rounded-xl glass-panel border border-white/10 text-white text-sm focus:outline-none focus:border-purple-400/50"
                      title="Choose visualization style"
                    >
                      <option value="force" className="bg-gray-900">🌐 Force Graph (Default)</option>
                      <option value="sankey" className="bg-gray-900">🌊 Sankey Flow</option>
                      <option value="circular" className="bg-gray-900">⭕ Circular Chord</option>
                      <option value="timeline" className="bg-gray-900">➡️ Timeline Flow</option>
                      <option value="hierarchical" className="bg-gray-900">🌳 Hierarchical Tree</option>
                      <option value="radial" className="bg-gray-900">📡 Radial</option>
                      <option value="grid" className="bg-gray-900">⊞ Grid</option>
                      <option value="matrix" className="bg-gray-900">🔲 Adjacency Matrix</option>
                      <option value="cluster" className="bg-gray-900">🫧 Cluster Bubbles</option>
                    </select>
                  )}

                  {/* Version Toggle - Only for force graph */}
                  {conceptMapData && selectedLayout === 'force' && (
                    <div className="flex gap-1 glass-panel rounded-xl p-1">
                      <button
                        onClick={() => setUseSimpleVersion(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                          useSimpleVersion
                            ? "bg-white/20 text-white"
                            : "text-white/50 hover:text-white/80"
                        }`}
                        title="Fast mode - Better performance, no tooltips"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Fast
                      </button>
                      <button
                        onClick={() => setUseSimpleVersion(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                          !useSimpleVersion
                            ? "bg-white/20 text-white"
                            : "text-white/50 hover:text-white/80"
                        }`}
                        title="Full mode - Rich tooltips with definitions, roles, and metrics"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Rich
                      </button>
                    </div>
                  )}

                  {/* Document Selector */}
                  {availableDocuments.length > 0 && (
                    <select
                      value={selectedDocumentId || ""}
                      onChange={(e) => handleDocumentChange(e.target.value)}
                      className="px-4 py-2 rounded-xl glass-panel border border-white/10 text-white text-sm focus:outline-none focus:border-purple-400/50"
                      disabled={isGenerating}
                    >
                      {availableDocuments.map((doc) => (
                        <option key={doc.id} value={doc.id} className="bg-gray-900">
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 relative">
                {!conceptMapData ? (
                  // No map generated yet
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      {availableDocuments.length === 0 ? (
                        <>
                          <AlertCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
                          <h3 className="text-xl text-white mb-2">No Documents Found</h3>
                          <p className="text-white/60 mb-6">
                            Upload a document first to generate a concept map
                          </p>
                        </>
                      ) : (
                        <>
                          <Network className="w-16 h-16 text-white/30 mx-auto mb-4" />
                          <h3 className="text-xl text-white mb-2">Generate Your Concept Map</h3>
                          <p className="text-white/60 mb-6">
                            AI will extract key concepts and relationships from "{selectedDocumentTitle}"
                          </p>
                          <GlassButton
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            size="lg"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Generating Map...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5 mr-2" />
                                Generate Concept Map
                              </>
                            )}
                          </GlassButton>
                          
                          {retryStatus && (
                            <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                              <p className="text-blue-300 text-sm flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {retryStatus}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {error && (
                        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                          <p className="text-red-400 text-sm leading-relaxed">{error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Show concept map with selected layout
                  <>
                    {selectedLayout === 'force' && (
                      useSimpleVersion ? (
                        <ConceptMapSimple
                          data={conceptMapData}
                          onRegenerate={handleGenerate}
                          isGenerating={isGenerating}
                          documentTitle={selectedDocumentTitle}
                        />
                      ) : (
                        <ConceptMap
                          data={conceptMapData}
                          onRegenerate={handleGenerate}
                          isGenerating={isGenerating}
                          documentTitle={selectedDocumentTitle}
                        />
                      )
                    )}
                    {selectedLayout === 'sankey' && (
                      <ConceptMapSankey
                        data={conceptMapData}
                        documentTitle={selectedDocumentTitle}
                      />
                    )}
                    {selectedLayout === 'circular' && (
                      <ConceptMapCircular
                        data={conceptMapData}
                        documentTitle={selectedDocumentTitle}
                      />
                    )}
                    {selectedLayout === 'timeline' && (
                      <ConceptMapTimeline
                        data={conceptMapData}
                        documentTitle={selectedDocumentTitle}
                      />
                    )}
                    {selectedLayout === 'hierarchical' && (
                      <ConceptMapHierarchical
                        data={conceptMapData}
                        documentTitle={selectedDocumentTitle}
                      />
                    )}
                    {selectedLayout === 'radial' && (
                      <ConceptMapRadial
                        data={conceptMapData}
                        documentTitle={selectedDocumentTitle}
                      />
                    )}
                    {selectedLayout === 'grid' && (
                      <ConceptMapGrid
                        data={conceptMapData}
                        documentTitle={selectedDocumentTitle}
                      />
                    )}
                    {selectedLayout === 'matrix' && (
                      <ConceptMapMatrix
                        data={conceptMapData}
                        documentTitle={selectedDocumentTitle}
                      />
                    )}
                    {selectedLayout === 'cluster' && (
                      <ConceptMapCluster
                        data={conceptMapData}
                        documentTitle={selectedDocumentTitle}
                      />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
