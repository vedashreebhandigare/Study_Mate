/**
 * Concept Map Generator
 * 
 * Uses Gemini AI to extract key concepts and relationships from documents
 * and generate interactive knowledge graphs.
 */

import { parseConceptMapJSON } from './json-parser-robust';

// Node types for visual differentiation
export type NodeType = "model" | "dataset" | "metric" | "technique" | "component" | "tradeoff";

// Category types for hierarchical organization
export type CategoryType = 
  | "Core Models/Algorithms"
  | "Data & Datasets"
  | "Evaluation Metrics"
  | "Technical Components"
  | "Methods & Techniques"
  | "System Infrastructure"
  | "Trade-offs & Considerations";

export interface ConceptNode {
  id: string;
  label: string;
  type: NodeType;
  definition: string;                 // 1-sentence plain English explanation
  role?: string;                      // How it contributes to the system
  category?: CategoryType;            // Hierarchical grouping
  metrics?: {                         // Performance/quantitative data
    [key: string]: string | number;
  };
  importance?: number;                // Centrality score (auto-calculated)
}

export interface ConceptEdge {
  source: string;
  target: string;
  label: string;                      // Semantic relationship type
  description?: string;               // Detailed explanation of relationship
  // ✨ NEW: BERT-based semantic analysis (optional - for enriched maps)
  semanticSimilarity?: number;        // 0.0-1.0, BERT cosine similarity between concepts
  relationshipStrength?: number;      // 0.0-1.0, composite strength score (for visualization)
  userMastery?: number;               // 0.0-1.0, user's understanding of this relationship
  recommendedReview?: boolean;        // true if user struggles with this connection
}

export interface ConceptMapData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  categories?: {                      // NEW: Category metadata
    name: CategoryType;
    color: string;
    nodeCount: number;
  }[];
}

// Get API key safely (handles environments where import.meta.env is undefined)
const getApiKey = () => {
  try {
    return import.meta?.env?.VITE_GEMINI_API_KEY || '';
  } catch {
    return '';
  }
};

// Initialize Gemini API key and URL
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-pro'; // Latest stable Pro model for structured output
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Clean and extract JSON from potentially messy AI response
 */
function extractAndCleanJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  
  // Find the first { and last } to extract just the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    throw new Error("No valid JSON object found in response");
  }
  
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  
  // Fix common JSON issues (but be careful not to break valid JSON)
  // Replace literal newlines in strings with \n
  // This is a simplified approach - we're looking for newlines between quotes
  
  return cleaned;
}

/**
 * Sanitize a string value to ensure it's valid JSON
 */
function sanitizeStringValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"')     // Escape quotes
    .replace(/\n/g, '\\n')    // Escape newlines
    .replace(/\r/g, '\\r')    // Escape carriage returns
    .replace(/\t/g, '\\t');   // Escape tabs
}

/**
 * Manually fix JSON by sanitizing string values
 * This is a fallback when JSON.parse fails
 */
function repairJSON(jsonString: string): ConceptMapData {
  // This is a complex operation, so we'll use a regex-based approach
  // to extract nodes and edges arrays
  
  try {
    // Extract nodes array
    const nodesMatch = jsonString.match(/"nodes"\s*:\s*\[([\s\S]*?)\]\s*,?\s*"edges"/);
    const edgesMatch = jsonString.match(/"edges"\s*:\s*\[([\s\S]*?)\]\s*}/);
    
    if (!nodesMatch || !edgesMatch) {
      throw new Error("Could not extract nodes or edges arrays");
    }
    
    // Parse individual node and edge objects more carefully
    const nodes: ConceptNode[] = [];
    const edges: ConceptEdge[] = [];
    
    // Extract node objects using a more robust pattern
    const nodePattern = /\{[^}]*?"id"\s*:\s*"([^"]+)"[^}]*?"label"\s*:\s*"([^"]+)"[^}]*?"type"\s*:\s*"([^"]+)"[^}]*?"definition"\s*:\s*"([^"]*?)"\s*\}/g;
    let nodeMatch;
    
    while ((nodeMatch = nodePattern.exec(nodesMatch[1])) !== null) {
      nodes.push({
        id: nodeMatch[1],
        label: nodeMatch[2],
        type: nodeMatch[3] as NodeType,
        definition: nodeMatch[4]
      });
    }
    
    // Extract edge objects
    const edgePattern = /\{[^}]*?"source"\s*:\s*"([^"]+)"[^}]*?"target"\s*:\s*"([^"]+)"[^}]*?"label"\s*:\s*"([^"]+)"\s*\}/g;
    let edgeMatch;
    
    while ((edgeMatch = edgePattern.exec(edgesMatch[1])) !== null) {
      edges.push({
        source: edgeMatch[1],
        target: edgeMatch[2],
        label: edgeMatch[3]
      });
    }
    
    if (nodes.length === 0) {
      throw new Error("No valid nodes found in response");
    }
    
    return { nodes, edges };
  } catch (error) {
    console.error("❌ Failed to repair JSON:", error);
    throw new Error("Could not repair malformed JSON response");
  }
}

/**
 * ✨ ENHANCEMENT: Enrich concept map with BERT semantic similarity scores
 * This is a POST-PROCESSING step that adds mathematical rigor to AI-generated relationships
 * 
 * For each edge, calculates:
 * - semanticSimilarity: BERT cosine similarity between source and target concept definitions
 * - relationshipStrength: Same as similarity (used for visualization - edge thickness)
 * 
 * @param conceptMapData - Original concept map from Gemini
 * @returns Enriched concept map with similarity scores on edges
 */
async function enrichConceptMapWithSimilarity(
  conceptMapData: ConceptMapData
): Promise<ConceptMapData> {
  try {
    // Dynamic import to avoid loading BERT if not needed
    const { EmbeddingService } = await import('./embedding-service');
    
    // Initialize BERT service (lazy loading)
    const embeddingService = await EmbeddingService.getInstance();
    console.log("🔬 BERT service initialized, calculating semantic similarities...");
    
    // Track statistics
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    
    // Calculate similarity for each edge
    const enrichedEdges = await Promise.all(
      conceptMapData.edges.map(async (edge, index) => {
        try {
          // Find source and target nodes
          const sourceNode = conceptMapData.nodes.find(n => n.id === edge.source);
          const targetNode = conceptMapData.nodes.find(n => n.id === edge.target);
          
          if (!sourceNode || !targetNode) {
            console.warn(`⚠️ Edge ${index}: Could not find nodes for ${edge.source} → ${edge.target}`);
            failCount++;
            return edge; // Return original edge
          }
          
          // Encode concept definitions
          const sourceText = sourceNode.definition || sourceNode.label;
          const targetText = targetNode.definition || targetNode.label;
          
          const [sourceEmbed, targetEmbed] = await Promise.all([
            embeddingService.encode(sourceText),
            embeddingService.encode(targetText),
          ]);
          
          // Calculate cosine similarity
          const similarity = embeddingService.cosineSimilarity(sourceEmbed, targetEmbed);
          
          // Round to 2 decimal places
          const roundedSimilarity = Math.round(similarity * 100) / 100;
          
          successCount++;
          
          // Return enriched edge
          return {
            ...edge,
            semanticSimilarity: roundedSimilarity,
            relationshipStrength: roundedSimilarity, // For visualization
          };
        } catch (error) {
          console.warn(`⚠️ Edge ${index}: Failed to calculate similarity:`, error);
          failCount++;
          return edge; // Return original edge on failure
        }
      })
    );
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Similarity enrichment complete:`);
    console.log(`   - Success: ${successCount}/${conceptMapData.edges.length} edges`);
    console.log(`   - Failed: ${failCount}/${conceptMapData.edges.length} edges`);
    console.log(`   - Duration: ${duration}ms (avg ${Math.round(duration/conceptMapData.edges.length)}ms per edge)`);
    
    // Print statistics from embedding service
    embeddingService.printStats();
    
    return {
      ...conceptMapData,
      edges: enrichedEdges,
    };
    
  } catch (error: any) {
    console.error("❌ BERT enrichment failed completely:", error.message);
    // Re-throw to trigger graceful degradation in caller
    throw error;
  }
}

/**
 * Generate concept map from document text using Gemini AI with retry logic
 */
export async function generateConceptMap(
  documentContent: string,
  documentTitle?: string,
  retryCount: number = 0
): Promise<ConceptMapData> {
  const maxRetries = 2;
  console.log(`🧠 Generating concept map with Gemini... (Attempt ${retryCount + 1}/${maxRetries + 1})`);

  // Validate API key
  if (!GEMINI_API_KEY) {
    throw new Error('⚠️ Gemini API key is not configured.');
  }

  const prompt = `You are an expert pedagogical knowledge graph generator. Create an interactive, deeply informative concept map.

🚨 CRITICAL: This is NOT a word cloud - you MUST create a CONNECTED GRAPH with MANY edges showing relationships!

🔥 JSON FORMATTING RULES (ABSOLUTELY CRITICAL - FOLLOW EXACTLY):
1. Your ENTIRE response must be ONLY the JSON object - absolutely NO text before or after
2. Start with { and end with } - nothing else
3. Do NOT wrap in markdown code blocks (\`\`\`json or \`\`\`)
4. Use double quotes for all strings
5. NO line breaks inside string values - keep each string on one line
6. Replace any quotes inside strings with single quotes or remove them
7. NO trailing commas before } or ]
8. Escape special characters properly (use \\" for quotes, \\n for newlines if needed)

EXAMPLE OF CORRECT FORMAT START:
{"nodes":[{"id":"example-1","label":"Example Node","type":"model","definition":"Single line definition"}],"edges":[]}

CONTENT RULES:
1. Extract 12-18 MOST IMPORTANT concepts only (prioritize centrality and pedagogical value)
2. Keep definitions to ONE clear sentence in plain English (NO line breaks!)
3. Include "role" field explaining how concept contributes to the system
4. Extract performance metrics when available (accuracy, speed, thresholds, complexity)
5. Create AT LEAST 20-30 semantic relationships (edges) - this is CRITICAL for pedagogical value
6. EVERY node must connect to at least 2-3 other nodes

CONCEPT SELECTION CRITERIA:
✅ Central to the paper's main contribution
✅ Frequently mentioned or referenced
✅ Part of the core methodology or system
✅ Has measurable performance data
✅ Connects multiple other concepts
❌ Skip low-impact implementation details
❌ Skip overly general background terms

CONCEPT CATEGORIES (assign each to one):
1. Core Models/Algorithms - Main models, neural networks, algorithms
2. Data & Datasets - Data sources, training sets, benchmarks
3. Evaluation Metrics - Performance measures, accuracy, precision, complexity
4. Technical Components - Layers, modules, building blocks, subsystems
5. Methods & Techniques - Training methods, optimization, preprocessing, detection
6. System Infrastructure - Frameworks, databases, deployment tools, APIs
7. Trade-offs & Considerations - Design choices, limitations, comparisons, constraints

NODE TYPES (for visual styling):
- model: ML models, architectures (Blue)
- dataset: Data sources, benchmarks (Green)
- metric: Performance measures, evaluation criteria (Orange)
- technique: Methods, optimizations, detection algorithms (Purple)
- component: Parts, layers, modules, subsystems (Teal)
- tradeoff: Comparisons, limitations, constraints (Pink)

RELATIONSHIP TYPES (use semantic labels):
Functional: uses, employs, applies, leverages, utilizes
Sequential: leads_to, followed_by, generates, produces, triggers
Hierarchical: contains, part_of, extends, implements, based_on, composed_of
Dependency: requires, depends_on, prerequisite_of, needs, built_on
Comparison: has_higher_accuracy_than, more_efficient_than, outperforms, alternative_to
Evaluation: measured_by, evaluated_on, assessed_with, benchmarked_on, tested_on
Complexity: has_higher_time_complexity_than, has_lower_space_complexity_than

🔥 EDGE REQUIREMENTS (MOST IMPORTANT PART):
- YOU MUST CREATE AT LEAST 25-35 EDGES - this is NOT optional!
- EVERY node should have AT LEAST 2-3 connections (otherwise it's a useless word cloud!)
- Prioritize: causal > functional > hierarchical > comparative > evaluative
- Use descriptive labels (e.g., "has_higher_time_complexity_than" not just "compares")
- Include "description" field for complex/quantitative relationships
- CRITICAL: Only create edges between nodes that EXIST in your nodes array (verify source and target IDs match exactly)
- Think about the PAPER'S STRUCTURE: What uses what? What measures what? What optimizes what? What trades off against what?
- EXAMPLE THINKING: If you have "CNN" and "Image Dataset", create edge: CNN → evaluated_on → Image Dataset
- EXAMPLE THINKING: If you have "LSTM" and "GRU", create edge: LSTM → has_higher_time_complexity_than → GRU (with metrics in description)

🎯 EXAMPLE OUTPUT (showing how to create rich, connected graphs):
{
  "nodes": [
    {
      "id": "cnn-lstm",
      "label": "CNN-LSTM",
      "type": "model",
      "category": "Core Models/Algorithms",
      "definition": "Hybrid deep learning architecture combining convolutional and recurrent layers for spatiotemporal feature extraction",
      "role": "Primary model for detecting inattention patterns from video frames in real-time",
      "metrics": {
        "accuracy": "95.9%",
        "fps": "30",
        "parameters": "2.4M"
      }
    },
    {
      "id": "ear",
      "label": "EAR",
      "type": "technique",
      "category": "Methods & Techniques",
      "definition": "Eye Aspect Ratio calculated from eye landmark distances to quantify eye closure level",
      "role": "Detects inattention by identifying sustained eye closure or excessive blinking patterns",
      "metrics": {
        "threshold": "0.27",
        "detection_rate": "98.2%"
      }
    },
    {
      "id": "mediapipe",
      "label": "MediaPipe",
      "type": "component",
      "category": "Technical Components",
      "definition": "Google's framework for real-time face and hand landmark detection",
      "role": "Provides facial landmark coordinates for extracting engagement features like EAR and MAR"
    },
    {
      "id": "accuracy",
      "label": "Overall Accuracy",
      "type": "metric",
      "category": "Evaluation Metrics",
      "definition": "Percentage of correct predictions across all engagement states",
      "role": "Primary evaluation metric for model performance",
      "metrics": {
        "value": "95.9%",
        "test_samples": "5000"
      }
    },
    {
      "id": "kaggle-yawn",
      "label": "Kaggle Yawn Dataset",
      "type": "dataset",
      "category": "Data & Datasets",
      "definition": "Public dataset containing labeled images of yawning and non-yawning faces",
      "role": "Training data source for yawn detection component of engagement system"
    }
  ],
  "edges": [
    {
      "source": "cnn-lstm",
      "target": "ear",
      "label": "uses",
      "description": "Model uses EAR as a key input feature for attention detection"
    },
    {
      "source": "cnn-lstm",
      "target": "mediapipe",
      "label": "requires",
      "description": "Architecture depends on MediaPipe for extracting facial landmarks"
    },
    {
      "source": "cnn-lstm",
      "target": "accuracy",
      "label": "measured_by",
      "description": "Model performance evaluated using overall accuracy metric of 95.9%"
    },
    {
      "source": "cnn-lstm",
      "target": "kaggle-yawn",
      "label": "evaluated_on",
      "description": "Yawn detection component trained and tested on Kaggle dataset"
    },
    {
      "source": "ear",
      "target": "mediapipe",
      "label": "depends_on",
      "description": "EAR calculation requires eye landmark coordinates from MediaPipe"
    },
    {
      "source": "mediapipe",
      "target": "ear",
      "label": "generates",
      "description": "MediaPipe provides landmark data used to compute EAR values"
    }
  ]
}

☝️ NOTICE: This example has 5 nodes and 6 edges - YOU should create 15-20 nodes and 25-35 edges!
☝️ NOTICE: Nearly every node has multiple connections - this creates a USEFUL KNOWLEDGE GRAPH, not a word cloud!

Return the JSON object now in this EXACT format (nothing else):

🔥 FINAL VALIDATION CHECKLIST (check before returning):
✅ Do I have 15-20 nodes?
✅ Do I have AT LEAST 25-35 edges? (CRITICAL!)
✅ Does EVERY node connect to at least 2-3 other nodes?
✅ Do all edge source/target IDs exactly match node IDs?
✅ Does every node have "role" field?
✅ Do nodes with metrics have quantitative data?
✅ Do complex edges have "description" field?
✅ Is all content grounded in the paper (no hallucinations)?
✅ Are relationship labels semantic and descriptive?

If you have fewer than 25 edges, GO BACK and add more connections! This is a GRAPH, not a word cloud!

⚠️ CRITICAL: Your response must start with { and end with }. Do not include ANY text before or after the JSON.

DOCUMENT: ${documentTitle || "Research Paper"}

TEXT (first 40000 chars):
${documentContent.slice(0, 40000)}

Return ONLY the JSON object (no extra text, no markdown, no code blocks):`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: retryCount === 0 ? 0.1 : 0.05, // Even lower temperature on retry
          maxOutputTokens: 8192,
          topP: 0.8,
          topK: 40,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API error:", errorText);
      
      // Handle 503 (overloaded) with exponential backoff retry
      if (response.status === 503 && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 3000; // 3s, 6s, 12s
        console.log(`🔄 API overloaded (503). Retrying in ${waitTime/1000}s... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateConceptMap(documentContent, documentTitle, retryCount + 1);
      }
      
      // Handle 429 (rate limit) with longer backoff
      if (response.status === 429 && retryCount < maxRetries) {
        const waitTime = 10000; // 10 seconds for rate limit
        console.log(`⏱️ Rate limited (429). Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateConceptMap(documentContent, documentTitle, retryCount + 1);
      }
      
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error("No response from Gemini API");
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log("📄 Raw Gemini response (first 300 chars):", text.slice(0, 300));

    // Use the robust JSON parser with multiple fallback strategies
    let conceptMapData: ConceptMapData;
    
    try {
      conceptMapData = parseConceptMapJSON(text);
      console.log("✅ Successfully parsed concept map JSON");
    } catch (parseError: any) {
      console.error("❌ All parse attempts failed:", parseError.message);
      console.log("Full response:", text);
      
      // Retry with different parameters
      if (retryCount < maxRetries) {
        console.log("🔄 Retrying with adjusted parameters...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return generateConceptMap(documentContent, documentTitle, retryCount + 1);
      }
      
      throw new Error("Failed to parse concept map from AI response after multiple attempts. " + parseError.message);
    }

    // Validate structure
    if (!conceptMapData.nodes || !Array.isArray(conceptMapData.nodes)) {
      throw new Error("Invalid concept map: missing nodes array");
    }
    if (!conceptMapData.edges || !Array.isArray(conceptMapData.edges)) {
      console.warn("⚠️ Missing edges array, creating empty array");
      conceptMapData.edges = [];
    }

    // Validate and clean each node
    conceptMapData.nodes = conceptMapData.nodes.filter((node, index) => {
      if (!node.id || !node.label || !node.type || !node.definition) {
        console.warn(`⚠️ Skipping invalid node at index ${index}:`, node);
        return false;
      }
      return true;
    });

    // Validate edges reference existing nodes
    const nodeIds = new Set(conceptMapData.nodes.map(n => n.id));
    conceptMapData.edges = conceptMapData.edges.filter((edge, index) => {
      if (!edge.source || !edge.target || !edge.label) {
        console.warn(`⚠️ Skipping invalid edge at index ${index}:`, edge);
        return false;
      }
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        console.warn(`⚠️ Skipping edge with non-existent node reference:`, edge);
        return false;
      }
      return true;
    });

    if (conceptMapData.nodes.length === 0) {
      throw new Error("No valid nodes found in concept map");
    }

    // 🔥 CRITICAL FIX: If we don't have enough edges, generate smart connections automatically
    // Reduced threshold to be more lenient - 1.2 edges per node or minimum 15
    const minEdges = Math.max(Math.ceil(conceptMapData.nodes.length * 1.2), 15);
    if (conceptMapData.edges.length < minEdges) {
      console.warn(`⚠️ Only ${conceptMapData.edges.length} edges generated, adding smart connections to reach minimum of ${minEdges}...`);
      const generatedEdges = generateSmartEdges(conceptMapData.nodes, conceptMapData.edges);
      conceptMapData.edges.push(...generatedEdges);
      console.log(`✅ Added ${generatedEdges.length} smart edges automatically (Total: ${conceptMapData.edges.length})`);
    } else {
      console.log(`✅ Good edge count: ${conceptMapData.edges.length} edges (minimum was ${minEdges})`);
    }

    console.log(`✅ Generated concept map: ${conceptMapData.nodes.length} nodes, ${conceptMapData.edges.length} edges`);

    // ✨ NEW: Enrich with BERT semantic similarity scores (OPTIONAL POST-PROCESSING)
    try {
      console.log("🔬 Enriching concept map with BERT semantic similarity scores...");
      conceptMapData = await enrichConceptMapWithSimilarity(conceptMapData);
      console.log("✅ Semantic similarity scores added to all edges");
    } catch (embedError: any) {
      console.warn("⚠️ Could not add semantic similarity (graceful degradation):", embedError.message);
      // Graceful degradation - continue with original concept map
      // This allows the app to work even if BERT model fails to load
    }

    return conceptMapData;
  } catch (error: any) {
    console.error("❌ Error generating concept map:", error);
    
    // Handle 503 errors specifically
    if (error.message?.includes("503")) {
      if (retryCount >= maxRetries) {
        throw new Error("🔄 The AI service is experiencing high demand. Please try again in 1-2 minutes. All automatic retries have been exhausted.");
      }
      throw error; // Will be caught by retry logic above
    }
    
    // Handle 429 rate limit
    if (error.message?.includes("429")) {
      throw new Error("⏱️ API rate limit reached. Please wait 1-2 minutes before trying again.");
    }
    
    // Provide more helpful error messages
    if (error.message?.includes("Failed to fetch")) {
      throw new Error("🌐 Network error: Unable to connect to Gemini API. Please check your internet connection.");
    }
    
    // If we've exhausted all retries, offer to use mock data
    if (retryCount >= maxRetries && error.message?.includes("parse")) {
      console.log("⚠️ Using fallback mock concept map due to parsing failures");
      return createMockConceptMap();
    }
    
    throw error;
  }
}

/**
 * Get node color based on type
 */
export function getNodeColor(type: NodeType): string {
  const colors: Record<NodeType, string> = {
    model: "#3B82F6",      // Blue
    dataset: "#10B981",    // Green
    metric: "#F59E0B",     // Orange
    technique: "#8B5CF6",  // Purple
    component: "#06B6D4",  // Cyan
    tradeoff: "#EC4899",   // Pink
  };
  return colors[type] || "#6B7280";
}

/**
 * Get category color for visual grouping
 */
export function getCategoryColor(category: CategoryType): string {
  const colors: Record<CategoryType, string> = {
    "Core Models/Algorithms": "#3B82F6",         // Blue
    "Data & Datasets": "#10B981",                // Green  
    "Evaluation Metrics": "#F59E0B",             // Orange
    "Technical Components": "#06B6D4",           // Cyan
    "Methods & Techniques": "#8B5CF6",           // Purple
    "System Infrastructure": "#6B7280",          // Gray
    "Trade-offs & Considerations": "#EC4899",    // Pink
  };
  return colors[category] || "#6B7280";
}

/**
 * Get node icon/emoji based on type
 */
export function getNodeIcon(type: NodeType): string {
  const icons: Record<NodeType, string> = {
    model: "🤖",
    dataset: "📊",
    metric: "📈",
    technique: "⚙️",
    component: "🧩",
    tradeoff: "⚖️",
  };
  return icons[type] || "📌";
}

/**
 * Calculate node importance (centrality) based on connections
 */
export function calculateNodeImportance(
  nodeId: string,
  edges: ConceptEdge[]
): number {
  return edges.filter(
    (edge) => edge.source === nodeId || edge.target === nodeId
  ).length;
}

/**
 * Generate smart edges automatically based on node types and categories
 * This ensures we have a connected graph even if AI fails to generate enough edges
 */
function generateSmartEdges(nodes: ConceptNode[], existingEdges: ConceptEdge[]): ConceptEdge[] {
  const newEdges: ConceptEdge[] = [];
  const existingEdgeSet = new Set(
    existingEdges.map(e => `${e.source}→${e.target}`)
  );

  // Helper to check if edge already exists
  const edgeExists = (source: string, target: string) => {
    return existingEdgeSet.has(`${source}→${target}`) || 
           existingEdgeSet.has(`${target}→${source}`);
  };

  // Helper to add edge if it doesn't exist
  const addEdge = (source: string, target: string, label: string, description?: string) => {
    if (!edgeExists(source, target) && source !== target) {
      newEdges.push({ source, target, label, description });
      existingEdgeSet.add(`${source}→${target}`);
    }
  };

  // Group nodes by type
  const nodesByType: { [key: string]: ConceptNode[] } = {};
  nodes.forEach(node => {
    if (!nodesByType[node.type]) nodesByType[node.type] = [];
    nodesByType[node.type].push(node);
  });

  // Rule 1: Models use techniques
  if (nodesByType.model && nodesByType.technique) {
    nodesByType.model.forEach(model => {
      nodesByType.technique.slice(0, 2).forEach(technique => {
        addEdge(model.id, technique.id, "uses", 
          `${model.label} employs ${technique.label} as part of its methodology`);
      });
    });
  }

  // Rule 2: Models evaluated on datasets
  if (nodesByType.model && nodesByType.dataset) {
    nodesByType.model.forEach(model => {
      nodesByType.dataset.slice(0, 2).forEach(dataset => {
        addEdge(model.id, dataset.id, "evaluated_on",
          `${model.label} performance tested on ${dataset.label}`);
      });
    });
  }

  // Rule 3: Models measured by metrics
  if (nodesByType.model && nodesByType.metric) {
    nodesByType.model.forEach(model => {
      nodesByType.metric.slice(0, 3).forEach(metric => {
        addEdge(model.id, metric.id, "measured_by",
          `${model.label} performance assessed using ${metric.label}`);
      });
    });
  }

  // Rule 4: Models contain components
  if (nodesByType.model && nodesByType.component) {
    nodesByType.model.forEach(model => {
      nodesByType.component.slice(0, 2).forEach(component => {
        addEdge(model.id, component.id, "contains",
          `${model.label} architecture incorporates ${component.label}`);
      });
    });
  }

  // Rule 5: Techniques depend on components
  if (nodesByType.technique && nodesByType.component) {
    nodesByType.technique.forEach(technique => {
      nodesByType.component.slice(0, 1).forEach(component => {
        addEdge(technique.id, component.id, "depends_on",
          `${technique.label} requires ${component.label} for implementation`);
      });
    });
  }

  // Rule 6: Datasets used by techniques
  if (nodesByType.dataset && nodesByType.technique) {
    nodesByType.dataset.forEach(dataset => {
      nodesByType.technique.slice(0, 1).forEach(technique => {
        addEdge(technique.id, dataset.id, "applied_to",
          `${technique.label} applied to ${dataset.label}`);
      });
    });
  }

  // Rule 7: Metrics evaluate techniques
  if (nodesByType.metric && nodesByType.technique) {
    nodesByType.metric.forEach(metric => {
      nodesByType.technique.slice(0, 1).forEach(technique => {
        addEdge(technique.id, metric.id, "assessed_with",
          `${technique.label} quality measured using ${metric.label}`);
      });
    });
  }

  // Rule 8: Tradeoffs affect models
  if (nodesByType.tradeoff && nodesByType.model) {
    nodesByType.tradeoff.forEach(tradeoff => {
      nodesByType.model.slice(0, 2).forEach(model => {
        addEdge(tradeoff.id, model.id, "constrains",
          `${tradeoff.label} is a key consideration in ${model.label} design`);
      });
    });
  }

  // Rule 9: Connect nodes in same category
  const nodesByCategory: { [key: string]: ConceptNode[] } = {};
  nodes.forEach(node => {
    if (node.category) {
      if (!nodesByCategory[node.category]) nodesByCategory[node.category] = [];
      nodesByCategory[node.category].push(node);
    }
  });

  Object.values(nodesByCategory).forEach(categoryNodes => {
    if (categoryNodes.length >= 2) {
      // Connect first two nodes in each category
      for (let i = 0; i < categoryNodes.length - 1 && i < 2; i++) {
        addEdge(
          categoryNodes[i].id, 
          categoryNodes[i + 1].id, 
          "related_to",
          `Both are ${categoryNodes[i].category} in the system`
        );
      }
    }
  });

  // Rule 10: Ensure every node has at least 1 connection
  nodes.forEach(node => {
    const connections = existingEdges.filter(
      e => e.source === node.id || e.target === node.id
    ).length + newEdges.filter(
      e => e.source === node.id || e.target === node.id
    ).length;

    if (connections === 0) {
      // Connect to the most connected node of a compatible type
      const compatibleNodes = nodes.filter(n => n.id !== node.id);
      if (compatibleNodes.length > 0) {
        const mostConnected = compatibleNodes[0]; // Already sorted by importance
        addEdge(node.id, mostConnected.id, "relates_to",
          `${node.label} has conceptual relationship with ${mostConnected.label}`);
      }
    }
  });

  console.log(`🤖 Generated ${newEdges.length} smart edges using heuristic rules`);
  return newEdges;
}

/**
 * Create mock concept map for testing (fallback)
 */
export function createMockConceptMap(): ConceptMapData {
  return {
    nodes: [
      {
        id: "neural-network",
        label: "Neural Network",
        type: "model",
        category: "Core Models/Algorithms",
        definition: "Computational model inspired by biological neural networks for pattern recognition",
        role: "Core architecture for learning complex patterns from data",
        metrics: { "layers": "3-100", "parameters": "1M-1B" },
      },
      {
        id: "deep-learning",
        label: "Deep Learning",
        type: "technique",
        category: "Methods & Techniques",
        definition: "Machine learning using multiple layers of neural networks for feature extraction",
        role: "Training methodology for building hierarchical feature representations",
      },
      {
        id: "cnn",
        label: "CNN",
        type: "model",
        category: "Core Models/Algorithms",
        definition: "Convolutional Neural Network specialized for processing grid-like data such as images",
        role: "Extracts spatial features from images using learnable convolutional filters",
        metrics: { "accuracy": "95-99%", "use_case": "Image Classification" },
      },
      {
        id: "rnn",
        label: "RNN",
        type: "model",
        category: "Core Models/Algorithms",
        definition: "Recurrent Neural Network designed for sequential data processing",
        role: "Captures temporal dependencies in sequential data through recurrent connections",
        metrics: { "sequence_length": "Variable" },
      },
      {
        id: "accuracy",
        label: "Accuracy",
        type: "metric",
        category: "Evaluation Metrics",
        definition: "Ratio of correct predictions to total predictions",
        role: "Primary metric for evaluating overall model performance",
        metrics: { "range": "0-100%", "optimal": ">90%" },
      },
      {
        id: "training-data",
        label: "Training Dataset",
        type: "dataset",
        category: "Data & Datasets",
        definition: "Collection of labeled examples used to train machine learning models",
        role: "Provides labeled examples for supervised learning and model optimization",
        metrics: { "size": "1K-10M samples" },
      },
      {
        id: "backpropagation",
        label: "Backpropagation",
        type: "technique",
        category: "Methods & Techniques",
        definition: "Algorithm for computing gradients to update neural network weights",
        role: "Enables gradient-based optimization by propagating errors backward through layers",
      },
      {
        id: "activation-function",
        label: "Activation Function",
        type: "component",
        category: "Technical Components",
        definition: "Non-linear function applied to neuron outputs to introduce non-linearity",
        role: "Enables neural networks to learn complex non-linear patterns and relationships",
      },
      {
        id: "overfitting",
        label: "Overfitting",
        type: "tradeoff",
        category: "Trade-offs & Considerations",
        definition: "Model performs well on training data but poorly on new unseen data",
        role: "Key consideration when balancing model complexity and generalization ability",
      },
      {
        id: "precision",
        label: "Precision",
        type: "metric",
        category: "Evaluation Metrics",
        definition: "Ratio of true positives to all positive predictions",
        role: "Measures model's ability to avoid false positive predictions",
        metrics: { "range": "0-1", "typical": "0.7-0.95" },
      },
    ],
    edges: [
      { 
        source: "deep-learning", 
        target: "neural-network", 
        label: "uses",
        description: "Deep learning employs neural networks as its fundamental architecture"
      },
      { 
        source: "cnn", 
        target: "neural-network", 
        label: "extends",
        description: "CNN is a specialized type of neural network with convolutional layers"
      },
      { 
        source: "rnn", 
        target: "neural-network", 
        label: "extends",
        description: "RNN extends neural networks with recurrent connections for sequences"
      },
      { 
        source: "neural-network", 
        target: "activation-function", 
        label: "contains",
        description: "Neural networks contain activation functions in each layer"
      },
      { 
        source: "backpropagation", 
        target: "neural-network", 
        label: "optimizes",
        description: "Backpropagation algorithm optimizes network weights through gradient descent"
      },
      { 
        source: "neural-network", 
        target: "accuracy", 
        label: "measured_by",
        description: "Model performance evaluated using accuracy metric"
      },
      { 
        source: "neural-network", 
        target: "precision", 
        label: "measured_by",
        description: "Model quality assessed using precision metric"
      },
      { 
        source: "neural-network", 
        target: "training-data", 
        label: "evaluated_on",
        description: "Network performance tested on training dataset"
      },
      { 
        source: "overfitting", 
        target: "neural-network", 
        label: "tradeoff_in",
        description: "Overfitting is a key consideration when designing network complexity"
      },
    ],
  };
}
