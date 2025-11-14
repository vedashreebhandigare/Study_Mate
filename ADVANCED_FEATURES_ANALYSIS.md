# Advanced Features Analysis: Concept Relationship Matrix & Multi-Hop Retrieval

## 📊 Executive Summary

**Status**: These advanced features are **NOT currently implemented** in your AI Learning Assistant.

**Current Approach**: Generative AI (Gemini) with prompt engineering  
**Proposed Approach**: Hybrid system combining embeddings + mathematical relationship scoring + multi-hop retrieval

---

## 🔍 Current State Analysis

### What You Have Now:

#### 1. **Concept Map Generation** (`concept-map-generator.ts`)
- Uses Gemini AI to extract 12-18 key concepts from documents
- Generates 20-30 semantic relationships (edges)
- Categorizes nodes into 6 types: `model`, `dataset`, `metric`, `technique`, `component`, `tradeoff`
- Relationship labels: `uses`, `depends_on`, `extends`, `part_of`, `measured_by`, etc.
- **Method**: Prompt engineering + LLM inference
- **Limitation**: No numerical relationship strength, no multi-hop reasoning

#### 2. **Quiz Generation** (`quiz-generator-advanced.ts`)
- Bloom's Taxonomy alignment (Undergraduate → Graduate → PhD)
- Difficulty distribution: easy (40%), medium (40%), hard (20%)
- **Method**: Generative AI with in-context examples
- **Limitation**: Single-pass retrieval, no cross-sectional understanding

#### 3. **Flashcard Generation** (`flashcard-generator-advanced.ts`)
- 6 cognitive clusters (Foundational → Critical Thinking)
- Embedded visualizations (diagrams, charts, timelines)
- **Method**: LLM-based generation with cluster-specific prompts
- **Limitation**: No iterative context expansion

### What's Missing:

❌ **Concept Relationship Matrix Framework**
- No co-occurrence counting (frequency analysis)
- No semantic similarity using BERT embeddings
- No syntactic distance (dependency parse trees)
- No composite scoring formula: `R[i,j,k] = max(0, Σm wm × fkm(ci, cj) - τk)`

❌ **Multi-Hop Contextual Retrieval**
- No iterative context expansion (hop-based)
- No BERT embedding-based document retrieval
- No cosine similarity threshold filtering
- No confidence-based result aggregation

❌ **Vector Storage Infrastructure**
- Supabase database lacks pgvector extension
- No embedding storage for documents/chunks
- No similarity search capabilities

---

## 🎯 Proposed System Architecture

### Architecture Diagram:
```
┌─────────────────────────────────────────────────────────────┐
│                    Document Upload                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│         Text Chunking (4000 words/chunk)                     │
│  Split by paragraphs, preserve semantic boundaries          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│         BERT Embedding Service                               │
│  Model: all-MiniLM-L6-v2 (384 dimensions)                   │
│  Process: Batch encode chunks → Store in Supabase          │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                          │
    ▼                          ▼
┌─────────────────┐   ┌──────────────────────┐
│ Concept         │   │ Multi-Hop            │
│ Relationship    │   │ Retrieval            │
│ Matrix          │   │ Engine               │
└────────┬────────┘   └─────────┬────────────┘
         │                       │
         │  ┌────────────────────┘
         │  │
         ▼  ▼
┌─────────────────────────────────────────────────────────────┐
│         Enhanced Learning Tools                              │
│  • Concept Maps (with relationship scores)                  │
│  • Multi-Hop Quizzes (cross-sectional questions)           │
│  • Relationship Matrix Heatmap (3-layer visualization)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧮 Concept Relationship Matrix Framework

### Mathematical Foundation:

**Composite Relationship Scoring Formula:**
```
R[i, j, k] = max(0, Σₘ wₘ × fₖₘ(cᵢ, cⱼ) - τₖ)
```

Where:
- `R[i, j, k]` = Relationship strength between concept `i` and `j` of type `k`
- `wₘ` = Weight for metric `m` (e.g., w₁=0.4 for co-occurrence, w₂=0.35 for semantic, w₃=0.25 for syntactic)
- `fₖₘ(cᵢ, cⱼ)` = Metric function value
- `τₖ` = Threshold for relationship type `k`

### Three Core Metrics:

#### 1. **Co-Occurrence (CO)**
```typescript
// Frequency of concepts appearing together in paragraphs/sentences
fCO(ci, cj) = count(ci AND cj in same context) / total_contexts
```

**Implementation:**
```typescript
interface CoOccurrenceMatrix {
  [concept1: string]: {
    [concept2: string]: number; // 0.0 to 1.0
  };
}

function calculateCoOccurrence(
  documents: string[], 
  concepts: string[]
): CoOccurrenceMatrix {
  // Split documents into paragraphs
  // Count co-appearances within sliding window
  // Normalize by total possible co-occurrences
}
```

#### 2. **Semantic Similarity (SC)**
```typescript
// Cosine similarity of BERT embedding vectors
fSC(ci, cj) = cosine_similarity(embedding(ci), embedding(cj))
           = (E₁ · E₂) / (||E₁|| × ||E₂||)
```

**Implementation:**
```typescript
interface EmbeddingService {
  encode(text: string): Promise<number[]>; // 384-dim vector
  cosineSimilarity(vec1: number[], vec2: number[]): number;
}

// Using all-MiniLM-L6-v2 from HuggingFace
async function getSemanticSimilarity(
  concept1: string, 
  concept2: string
): Promise<number> {
  const e1 = await bertModel.encode(concept1);
  const e2 = await bertModel.encode(concept2);
  return cosineSimilarity(e1, e2);
}
```

#### 3. **Syntactic Distance (SD)**
```typescript
// Exponential decay based on dependency parse tree depth
fSD(ci, cj) = exp(-depth(ci, cj) / λ)
```

**Implementation:**
```typescript
interface DependencyParser {
  parse(sentence: string): DependencyTree;
  findPath(node1: string, node2: string): number; // tree depth
}

function calculateSyntacticDistance(
  concept1: string, 
  concept2: string,
  sentences: string[]
): number {
  const depths = sentences.map(sent => {
    const tree = parser.parse(sent);
    return tree.findPath(concept1, concept2);
  });
  const avgDepth = average(depths.filter(d => d !== Infinity));
  return Math.exp(-avgDepth / 2.0); // λ = 2.0
}
```

### Weighted Composite Score:

```typescript
interface RelationshipScores {
  coOccurrence: number;
  semanticSimilarity: number;
  syntacticDistance: number;
  compositeScore: number;
}

function calculateCompositeScore(
  concept1: string, 
  concept2: string,
  weights = { co: 0.4, sem: 0.35, syn: 0.25 },
  threshold = 0.5
): RelationshipScores {
  const co = calculateCoOccurrence(concept1, concept2);
  const sem = getSemanticSimilarity(concept1, concept2);
  const syn = calculateSyntacticDistance(concept1, concept2);
  
  const composite = Math.max(0, 
    weights.co * co + 
    weights.sem * sem + 
    weights.syn * syn - 
    threshold
  );
  
  return { 
    coOccurrence: co, 
    semanticSimilarity: sem, 
    syntacticDistance: syn, 
    compositeScore: composite 
  };
}
```

### Relationship Types with Thresholds:

```typescript
const RELATIONSHIP_TYPES = {
  prerequisite: { threshold: 0.7, label: "requires" },
  related_to: { threshold: 0.5, label: "connects_to" },
  example_of: { threshold: 0.6, label: "illustrates" },
  measured_by: { threshold: 0.55, label: "evaluated_with" },
} as const;

// Example: "Docker" → "Container" relationship
// CO: 0.85 (high co-occurrence in same paragraphs)
// SC: 0.92 (semantically very similar via BERT)
// SD: 0.78 (short syntactic path in dependency trees)
// Composite: 0.4*0.85 + 0.35*0.92 + 0.25*0.78 = 0.857
// Result: Strong "related_to" relationship (> 0.5 threshold)
```

---

## 🔄 Multi-Hop Contextual Retrieval Algorithm

### Pseudocode:

```
Input: Query Q, Documents D, Hops H, threshold τ

For each hop h < H:
  1. E ← BERT(Q ∪ Current_Context)
  2. Retrieve docs where cosine_sim(E, doc) ≥ τ
  3. Expand: Context ← Context ∪ top-k docs

Output: Contexts with confidence ≥ γ
```

### TypeScript Implementation:

```typescript
interface MultiHopConfig {
  maxHops: number;          // H = 3 (typical)
  similarityThreshold: number; // τ = 0.7
  topK: number;             // k = 5
  confidenceThreshold: number; // γ = 0.6
}

interface RetrievalResult {
  context: string[];
  confidence: number;
  hops: number;
  intermediateSteps: {
    hop: number;
    query: string;
    retrievedDocs: string[];
    similarities: number[];
  }[];
}

async function multiHopRetrieval(
  query: string,
  documents: string[],
  config: MultiHopConfig
): Promise<RetrievalResult> {
  let currentContext = [query];
  const intermediateSteps = [];
  
  for (let hop = 0; hop < config.maxHops; hop++) {
    // Step 1: Encode current context
    const contextText = currentContext.join(' ');
    const queryEmbedding = await bertModel.encode(contextText);
    
    // Step 2: Calculate similarities with all documents
    const docEmbeddings = await Promise.all(
      documents.map(doc => bertModel.encode(doc))
    );
    
    const similarities = docEmbeddings.map(docEmbed => 
      cosineSimilarity(queryEmbedding, docEmbed)
    );
    
    // Step 3: Filter by threshold and get top-k
    const relevantDocs = documents
      .map((doc, idx) => ({ doc, similarity: similarities[idx] }))
      .filter(item => item.similarity >= config.similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, config.topK);
    
    // Step 4: Expand context
    const newDocs = relevantDocs.map(item => item.doc);
    currentContext.push(...newDocs);
    
    intermediateSteps.push({
      hop: hop + 1,
      query: contextText,
      retrievedDocs: newDocs,
      similarities: relevantDocs.map(item => item.similarity),
    });
    
    // Early stopping if no new docs found
    if (newDocs.length === 0) break;
  }
  
  // Calculate overall confidence
  const avgConfidence = intermediateSteps.reduce((sum, step) => 
    sum + average(step.similarities), 0
  ) / intermediateSteps.length;
  
  return {
    context: currentContext,
    confidence: avgConfidence,
    hops: intermediateSteps.length,
    intermediateSteps,
  };
}
```

### Example Multi-Hop Progression:

```
Hop 0 (Initial Query): "Docker"
  → Query Embedding: E₀ = BERT("Docker")
  
Hop 1:
  → Retrieved Docs (cosine_sim ≥ 0.7):
    - "Containerization is a virtualization method..."
    - "Docker images contain application code and dependencies..."
  → Updated Context: "Docker" + retrieved docs
  → New Embedding: E₁ = BERT("Docker + containerization + images")
  
Hop 2:
  → Retrieved Docs (cosine_sim ≥ 0.7):
    - "Microservices architecture uses containers..."
    - "Kubernetes orchestrates Docker containers..."
  → Updated Context: Previous + new docs
  → New Embedding: E₂ = BERT(full context)
  
Hop 3:
  → Retrieved Docs:
    - "Scalability in distributed systems..."
  → Final Context: "Docker → containerization → microservices → scalability"
  → Confidence: 0.82 (average of all hop similarities)
```

---

## 📦 Implementation Stack

### Required Libraries:

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.2",  // Transformers.js (BERT in browser)
    "@huggingface/inference": "^2.8.0", // HuggingFace API (alternative)
    "compromise": "^14.13.0",            // NLP parser for syntactic distance
    "pgvector": "^0.2.0",                // Postgres vector extension client
    "mathjs": "^12.4.3"                  // Vector math utilities
  }
}
```

### BERT Embedding Service (Browser-Based):

```typescript
import { pipeline, env } from '@xenova/transformers';

export class BERTEmbeddingService {
  private static instance: BERTEmbeddingService;
  private embedder: any;
  private cache = new Map<string, number[]>();
  
  private constructor() {}
  
  static async getInstance(): Promise<BERTEmbeddingService> {
    if (!this.instance) {
      this.instance = new BERTEmbeddingService();
      await this.instance.init();
    }
    return this.instance;
  }
  
  private async init() {
    // Use all-MiniLM-L6-v2 (384 dimensions, fast inference)
    this.embedder = await pipeline(
      'feature-extraction', 
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  
  async encode(text: string): Promise<number[]> {
    // Check cache
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }
    
    // Generate embedding
    const output = await this.embedder(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    const embedding = Array.from(output.data);
    this.cache.set(text, embedding);
    return embedding;
  }
  
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }
}
```

### Supabase Database Schema:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Store document chunk embeddings
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(384), -- all-MiniLM-L6-v2 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Store concept relationship scores
CREATE TABLE concept_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  source_concept TEXT NOT NULL,
  target_concept TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  co_occurrence_score FLOAT NOT NULL,
  semantic_similarity_score FLOAT NOT NULL,
  syntactic_distance_score FLOAT NOT NULL,
  composite_score FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, source_concept, target_concept, relationship_type)
);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    id,
    document_id,
    chunk_text,
    1 - (embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## 🎨 UI Components

### 1. **Relationship Matrix Heatmap** (`ConceptRelationshipMatrixAdvanced.tsx`)

```tsx
interface RelationshipMatrixProps {
  concepts: string[];
  relationships: Map<string, Map<string, RelationshipScores>>;
  activeLayer: 'co-occurrence' | 'semantic' | 'syntactic' | 'composite';
}

export function ConceptRelationshipMatrixAdvanced({ 
  concepts, 
  relationships, 
  activeLayer 
}: RelationshipMatrixProps) {
  return (
    <div className="matrix-container">
      {/* Layer Toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveLayer('co-occurrence')}>
          📊 Co-Occurrence
        </button>
        <button onClick={() => setActiveLayer('semantic')}>
          🔗 Semantic Similarity
        </button>
        <button onClick={() => setActiveLayer('syntactic')}>
          🌳 Syntactic Distance
        </button>
        <button onClick={() => setActiveLayer('composite')}>
          ⚡ Composite Score
        </button>
      </div>
      
      {/* Heatmap Grid */}
      <svg width={concepts.length * 50} height={concepts.length * 50}>
        {concepts.map((rowConcept, i) => 
          concepts.map((colConcept, j) => {
            const score = relationships
              .get(rowConcept)
              ?.get(colConcept)?.[activeLayer] || 0;
            
            return (
              <rect
                key={`${i}-${j}`}
                x={j * 50}
                y={i * 50}
                width={50}
                height={50}
                fill={getHeatmapColor(score)}
                opacity={score}
                onClick={() => showRelationshipDetails(rowConcept, colConcept)}
              />
            );
          })
        )}
      </svg>
      
      {/* Legend */}
      <div className="legend">
        <span>Weak (0.0)</span>
        <div className="gradient-bar" />
        <span>Strong (1.0)</span>
      </div>
    </div>
  );
}
```

### 2. **Multi-Hop Quiz Question Generator**

```tsx
interface MultiHopQuestion extends QuizQuestion {
  conceptChain: string[]; // e.g., ["Docker", "Container", "Microservices"]
  hopCount: number;
  intermediateContext: string[];
}

async function generateMultiHopQuestion(
  documentId: string,
  startConcept: string,
  difficulty: DifficultyLevel
): Promise<MultiHopQuestion> {
  // Step 1: Multi-hop retrieval to find related concepts
  const retrieval = await multiHopRetrieval(
    startConcept,
    await getDocumentChunks(documentId),
    { maxHops: 3, similarityThreshold: 0.7, topK: 5, confidenceThreshold: 0.6 }
  );
  
  // Step 2: Extract concept chain from retrieval
  const conceptChain = extractConceptsFromContext(retrieval.context);
  
  // Step 3: Generate cross-sectional question
  const prompt = `
    Generate a ${difficulty} level question that requires understanding the 
    relationship between these concepts: ${conceptChain.join(' → ')}
    
    Context from multi-hop retrieval:
    ${retrieval.context.join('\n\n')}
    
    The question should test deep understanding of how these concepts connect,
    not just surface-level definitions.
  `;
  
  const question = await generateWithGemini(prompt, {
    temperature: 0.6,
    maxOutputTokens: 500,
  });
  
  return {
    ...question,
    conceptChain,
    hopCount: retrieval.hops,
    intermediateContext: retrieval.context,
  };
}
```

---

## ⚖️ Is This Worth Implementing?

### ✅ **PROS (Why You SHOULD Implement):**

1. **Academic Rigor**
   - Mathematically grounded relationship scoring (not just LLM guessing)
   - Reproducible results with quantifiable metrics
   - Publishable in educational technology research

2. **Deep Learning Enhancement**
   - Multi-hop retrieval creates **cross-sectional understanding**
   - Students see connections across document sections (not just isolated facts)
   - Mimics human learning patterns (progressive concept building)

3. **Advanced Quiz Quality**
   - PhD-level questions that test **implicit relationships**
   - Example: "How does Docker's resource isolation affect microservice scalability in Kubernetes?"
   - Requires understanding: Docker → Containers → Microservices → Kubernetes → Scalability

4. **Differentiation from Competitors**
   - Most AI tutors use single-pass LLM generation (shallow)
   - Your system would use **iterative embedding-based reasoning** (deep)
   - Unique selling point: "Multi-hop contextual learning"

5. **Performance Benefits**
   - BERT embeddings (384-dim) are **much faster** than full LLM inference
   - Caching embeddings reduces repeated API calls
   - Local computation possible (Transformers.js runs in browser)

### ❌ **CONS (Challenges to Consider):**

1. **Implementation Complexity**
   - Requires understanding NLP (dependency parsing, embeddings)
   - Database migration for pgvector (additional infrastructure)
   - Debugging multi-hop logic is non-trivial

2. **Computational Cost**
   - Initial embedding generation for all documents (one-time)
   - Dependency parsing can be slow for large documents
   - Browser memory usage for BERT model (~50MB)

3. **User Perception**
   - Most students won't notice the technical difference
   - "Good enough" LLM generation might suffice for 90% of use cases
   - Marginal improvement in perceived quality vs development effort

4. **Maintenance Burden**
   - Additional codebase complexity (3-4 new modules)
   - Dependency on BERT model updates
   - More unit tests and edge cases

### 🎯 **Recommendation:**

**Implement in 2 Phases:**

**Phase 1: Minimum Viable Advanced Features** (2-3 weeks)
- ✅ Add BERT embedding service (Transformers.js)
- ✅ Implement semantic similarity only (skip syntactic distance for now)
- ✅ Create multi-hop retrieval with 2 hops maximum
- ✅ Enhance existing concept map with similarity scores
- ✅ Test on 5-10 sample research papers

**Phase 2: Full Mathematical Framework** (4-6 weeks)
- ⏳ Add dependency parsing for syntactic distance
- ⏳ Implement composite relationship scoring
- ⏳ Build relationship matrix heatmap UI
- ⏳ Integrate multi-hop quiz generation
- ⏳ Optimize performance (caching, batch processing)

**ROI Assessment:**
- **High Value for**: Research paper analysis, PhD-level content, technical documentation
- **Low Value for**: Simple textbooks, short articles, basic concept learning
- **Sweet Spot**: Complex technical domains (ML/AI papers, software architecture docs)

---

## 🚀 Quick Start Guide (Phase 1)

### Step 1: Install Dependencies

```bash
npm install @xenova/transformers mathjs
npm install -D @types/mathjs
```

### Step 2: Create Embedding Service

```typescript
// src/lib/embedding-service.ts
import { pipeline } from '@xenova/transformers';

export class EmbeddingService {
  private static embedder: any;
  
  static async init() {
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  
  static async encode(text: string): Promise<number[]> {
    const output = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
  
  static cosineSimilarity(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
}
```

### Step 3: Enhance Concept Map Generator

```typescript
// Add to concept-map-generator.ts
import { EmbeddingService } from './embedding-service';

export interface ConceptEdge {
  source: string;
  target: string;
  label: string;
  description?: string;
  semanticSimilarity?: number; // NEW!
}

async function enhanceEdgesWithSimilarity(
  edges: ConceptEdge[], 
  nodes: ConceptNode[]
): Promise<ConceptEdge[]> {
  await EmbeddingService.init();
  
  return Promise.all(edges.map(async edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return edge;
    
    const sourceEmbed = await EmbeddingService.encode(sourceNode.definition);
    const targetEmbed = await EmbeddingService.encode(targetNode.definition);
    const similarity = EmbeddingService.cosineSimilarity(sourceEmbed, targetEmbed);
    
    return { ...edge, semanticSimilarity: similarity };
  }));
}
```

### Step 4: Update UI to Show Scores

```tsx
// In ConceptMap.tsx or ConceptMapMatrix.tsx
{edges.map(edge => (
  <div className="edge-info">
    <span>{edge.label}</span>
    {edge.semanticSimilarity && (
      <span className="similarity-badge">
        {(edge.semanticSimilarity * 100).toFixed(0)}% similar
      </span>
    )}
  </div>
))}
```

---

## 📚 Further Reading

### Academic Papers:
1. **BERT**: Devlin et al., "BERT: Pre-training of Deep Bidirectional Transformers" (2018)
2. **Multi-Hop QA**: Yang et al., "HotpotQA: A Dataset for Diverse, Explainable Multi-hop Question Answering" (2018)
3. **Concept Maps**: Novak & Cañas, "The Theory Underlying Concept Maps" (2006)

### Code Examples:
- **Transformers.js Docs**: https://huggingface.co/docs/transformers.js
- **pgvector Guide**: https://github.com/pgvector/pgvector
- **BERT Sentence Embeddings**: https://www.sbert.net/

### Similar Implementations:
- **LangChain Multi-Query Retriever**: https://python.langchain.com/docs/modules/data_connection/retrievers/MultiQueryRetriever
- **LlamaIndex Recursive Retrieval**: https://docs.llamaindex.ai/en/stable/examples/query_engine/recursive_retriever.html

---

## 📞 Support & Questions

If you decide to implement this, I can help with:
- ✅ Debugging BERT embedding issues
- ✅ Optimizing multi-hop retrieval performance
- ✅ Creating visualizations for relationship matrices
- ✅ Writing unit tests for mathematical functions
- ✅ Supabase pgvector migration scripts

**Estimated Total Implementation Time:**
- Phase 1 (MVP): **2-3 weeks** (40-60 hours)
- Phase 2 (Full): **4-6 weeks** (80-120 hours)

**Complexity Level:** ⭐⭐⭐⭐☆ (Advanced - requires NLP knowledge)

---

**Last Updated:** 2025-01-07  
**Status:** Planning Phase  
**Decision Needed:** Approve Phase 1 implementation?
