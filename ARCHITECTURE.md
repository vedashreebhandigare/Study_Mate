# 🏗️ SYSTEM ARCHITECTURE: Advanced NLP Features

## 📊 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
├─────────────────────────────────────────────────────────────────────┤
│  Dashboard → Upload Document → Generate Concept Map / Quiz          │
│                              ↓                                       │
│                     ConceptMapSimple.tsx                             │
│                     QuizTaker.tsx                                    │
└─────────────────┬───────────────────────────┬───────────────────────┘
                  │                           │
                  ↓                           ↓
┌─────────────────────────────┐   ┌──────────────────────────────────┐
│   CONCEPT MAP PIPELINE      │   │   QUIZ GENERATION PIPELINE       │
├─────────────────────────────┤   ├──────────────────────────────────┤
│  1. Gemini AI               │   │  1. Content Analyzer             │
│     └→ Generate nodes/edges │   │     └→ Analyze document          │
│                             │   │                                  │
│  2. BERT Enrichment         │   │  2. Multi-Hop Retriever          │
│     └→ Calculate similarity │   │     └→ Find concept chains       │
│                             │   │                                  │
│  3. Visualization           │   │  3. Gemini AI                    │
│     └→ Render with scores   │   │     └→ Generate questions        │
│                             │   │                                  │
│  4. Edge Enhancement        │   │  4. Quiz Validator               │
│     └→ Thickness, color     │   │     └→ Quality checks            │
└──────────┬──────────────────┘   └────────────┬─────────────────────┘
           │                                   │
           └───────────────┬───────────────────┘
                           ↓
           ┌───────────────────────────────────┐
           │    BERT EMBEDDING SERVICE         │
           ├───────────────────────────────────┤
           │  - Model: all-MiniLM-L6-v2        │
           │  - Dimension: 384                 │
           │  - Cache: LRU (1000 entries)      │
           │  - Operations:                    │
           │    • encode(text) → embedding     │
           │    • cosineSimilarity(a, b)       │
           │    • encodeBatch([texts])         │
           └─────────────┬─────────────────────┘
                         │
                         ↓
           ┌───────────────────────────────────┐
           │  TRANSFORMERS.JS (Browser-based)  │
           │  - Runs in Web Worker             │
           │  - No backend required            │
           │  - ~50MB model download           │
           └───────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                      QUIZ TAKING FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Answers Question                                               │
│         ↓                                                            │
│  Is Multi-Hop? (check [Multi-Hop] prefix)                           │
│         ├─── YES → Extract Concept Chain from Explanation           │
│         │          (Concept Chain: Docker → Container → Kubernetes)  │
│         │          ↓                                                 │
│         │    updateConceptChainMastery(userId, chain, isCorrect)    │
│         │          ↓                                                 │
│         │    Update Supabase:                                        │
│         │      - Docker → Container (mastery++)                      │
│         │      - Container → Kubernetes (mastery++)                  │
│         │      - Docker → Kubernetes (transitive)                    │
│         │                                                            │
│         └─── NO → Extract Concept from Question                     │
│                   ↓                                                  │
│             updateConceptMastery(userId, conceptId, isCorrect)       │
│                   ↓                                                  │
│             Update Supabase (single concept)                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Multi-Hop Retrieval Algorithm

```
INPUT: query = "Docker"
       chunks = [chunk1, chunk2, ..., chunk100]
       config = { maxHops: 3, topK: 5, threshold: 0.65 }

┌──────────────────────────────────────────────────────────────┐
│  INITIALIZATION                                              │
├──────────────────────────────────────────────────────────────┤
│  currentContext = ["Docker"]                                 │
│  conceptChain = ["Docker"]                                   │
│  retrievedChunks = []                                        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  HOP 1                                                       │
├──────────────────────────────────────────────────────────────┤
│  1. contextText = "Docker"                                   │
│  2. E_context = BERT("Docker")                               │
│  3. similarities = []                                        │
│     for each chunk in chunks:                                │
│       E_chunk = BERT(chunk)                                  │
│       sim = cosine_similarity(E_context, E_chunk)            │
│       similarities.append({chunk, sim})                      │
│  4. relevant = filter(similarities, sim >= 0.65)             │
│     top5 = sort(relevant).take(5)                            │
│  5. Extract concepts: ["Container", "Image"]                 │
│  6. conceptChain += ["Container", "Image"]                   │
│  7. currentContext += top5 chunks                            │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  HOP 2                                                       │
├──────────────────────────────────────────────────────────────┤
│  1. contextText = "Docker Container Image ..."               │
│  2. E_context = BERT(contextText)                            │
│  3. Calculate similarities (same as Hop 1)                   │
│  4. top5 = [chunk23, chunk45, chunk78, ...]                  │
│  5. Extract concepts: ["Microservices"]                      │
│  6. conceptChain += ["Microservices"]                        │
│  7. currentContext += top5 chunks                            │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  HOP 3                                                       │
├──────────────────────────────────────────────────────────────┤
│  1. contextText = "Docker Container Microservices ..."       │
│  2. E_context = BERT(contextText)                            │
│  3. Calculate similarities                                   │
│  4. top5 = [chunk67, chunk89, ...]                           │
│  5. Extract concepts: ["Kubernetes", "Orchestration"]        │
│  6. conceptChain += ["Kubernetes", "Orchestration"]          │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  OUTPUT                                                      │
├──────────────────────────────────────────────────────────────┤
│  {                                                           │
│    conceptChain: [                                           │
│      "Docker",                                               │
│      "Container",                                            │
│      "Image",                                                │
│      "Microservices",                                        │
│      "Kubernetes",                                           │
│      "Orchestration"                                         │
│    ],                                                        │
│    context: [chunk3, chunk5, chunk23, chunk45, ...],         │
│    confidence: 0.82,  // Avg similarity across hops          │
│    hops: 3,                                                  │
│    success: true                                             │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

```sql
┌─────────────────────────────────────────────────────────────┐
│  TABLE: relationship_mastery                                │
├─────────────────────────────────────────────────────────────┤
│  Column             Type        Constraints                 │
├─────────────────────────────────────────────────────────────┤
│  id                 UUID        PRIMARY KEY, auto-gen       │
│  user_id            UUID        FK → auth.users             │
│  document_id        UUID        FK → documents (optional)   │
│  source_concept     TEXT        NOT NULL                    │
│  target_concept     TEXT        NOT NULL                    │
│  understanding_score REAL       0.0-1.0, DEFAULT 0.0        │
│  times_practiced    INTEGER     DEFAULT 0                   │
│  correct_answers    INTEGER     DEFAULT 0                   │
│  last_practiced     TIMESTAMPTZ DEFAULT NOW()               │
│  created_at         TIMESTAMPTZ DEFAULT NOW()               │
├─────────────────────────────────────────────────────────────┤
│  UNIQUE(user_id, source_concept, target_concept)            │
└─────────────────────────────────────────────────────────────┘

INDEXES:
  1. idx_relationship_mastery_user_id (user_id)
  2. idx_relationship_mastery_document_id (document_id)
  3. idx_relationship_mastery_score (user_id, understanding_score)
  4. idx_relationship_mastery_concepts (source_concept, target_concept)

RLS POLICIES:
  - SELECT: Users can view own records (auth.uid() = user_id)
  - INSERT: Users can create own records
  - UPDATE: Users can update own records
  - DELETE: Users can delete own records
```

---

## 📈 Data Flow: Relationship Mastery Update

```
User Answers Multi-Hop Question
  Question: "[Multi-Hop] How does Docker relate to Kubernetes?"
  Explanation: "Concept Chain: Docker → Container → Kubernetes\n\n..."
  User Answer: Correct

                    ↓

extractConceptChain(explanation)
  → ["Docker", "Container", "Kubernetes"]

                    ↓

updateConceptChainMastery(userId, ["Docker", "Container", "Kubernetes"], true)

                    ↓

┌───────────────────────────────────────────────────────────────┐
│  Parallel Updates (Promise.all)                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  1. updateRelationshipMastery(userId, "Docker", "Container")  │
│     ┌──────────────────────────────────────────────────┐     │
│     │  Fetch existing: { score: 0.5, practiced: 1 }    │     │
│     │  Calculate new:                                  │     │
│     │    newPracticed = 2                              │     │
│     │    newCorrect = 2  (was 1, +1)                   │     │
│     │    accuracy = 2/2 = 1.0                          │     │
│     │    newScore = 0.5*0.7 + 1.0*0.3 = 0.65          │     │
│     │  Upsert to Supabase                              │     │
│     └──────────────────────────────────────────────────┘     │
│                                                               │
│  2. updateRelationshipMastery(userId, "Container", "Kubernetes") │
│     ┌──────────────────────────────────────────────────┐     │
│     │  Fetch existing: null (new relationship)         │     │
│     │  Calculate new:                                  │     │
│     │    newPracticed = 1                              │     │
│     │    newCorrect = 1                                │     │
│     │    newScore = 0.5  (start conservative)          │     │
│     │  Insert to Supabase                              │     │
│     └──────────────────────────────────────────────────┘     │
│                                                               │
│  3. updateRelationshipMastery(userId, "Docker", "Kubernetes") │
│     ┌──────────────────────────────────────────────────┐     │
│     │  Transitive relationship (first → last)          │     │
│     │  Same logic as above                             │     │
│     └──────────────────────────────────────────────────┘     │
│                                                               │
└───────────────────────────────────────────────────────────────┘

                    ↓

Console Output:
  ✅ Updated relationship mastery: Docker → Container = 65%
  ✅ Updated relationship mastery: Container → Kubernetes = 50%
  ✅ Updated relationship mastery: Docker → Kubernetes = 50%
  ✅ Updated 3/3 relationship mastery records
```

---

## 🎨 UI Component Hierarchy

```
App.tsx
  ├── AnimatedBackground
  ├── FloatingNav
  └── Router (currentPage state)
      ├── HomePage
      ├── AuthPage
      ├── Dashboard
      │   ├── DashboardCard (documents)
      │   ├── DocumentUploader
      │   └── Actions
      │       ├── Generate Concept Map
      │       │   └→ ConceptMapSimple
      │       │       ├── ForceGraph2D
      │       │       │   ├── Nodes (circles)
      │       │       │   └── Links (edges)
      │       │       │       ├── thickness = relationshipStrength
      │       │       │       ├── color = userMastery
      │       │       │       └── label = semanticSimilarity%
      │       │       └── ConceptMapDiagnostic
      │       │
      │       └── Generate Quiz
      │           └→ QuizGeneratorAdvanced
      │               ├── QuizConfigurator
      │               └→ QuizTaker
      │                   ├── Quiz Start Screen
      │                   │   └── QuizMetrics
      │                   ├── Question Cards
      │                   │   ├── Progress Bar
      │                   │   ├── Multi-Hop Badge (if applicable)
      │                   │   └── Options
      │                   └── Results Screen
      │                       ├── Score Card
      │                       ├── Quality Metrics
      │                       └── Question Review
      │                           └── Explanation (with concept chain)
      │
      ├── ProfilePage
      └── ModuleDetailPage
```

---

## 🔧 Key Files & Dependencies

```
src/
├── lib/
│   ├── embedding-service.ts ──────┐
│   │   (BERT, LRU cache)          │
│   │                               │
│   ├── multi-hop-retrieval.ts ────┤
│   │   (iterative context expansion) → Uses BERT
│   │                               │
│   ├── concept-map-generator.ts ──┤
│   │   (Gemini + BERT enrichment) │
│   │                               │
│   ├── quiz-generator-advanced.ts ┤
│   │   (multi-hop questions) ─────┘
│   │
│   └── database.ts
│       (relationship mastery CRUD)
│
├── components/
│   ├── ConceptMapSimple.tsx
│   │   (visualization with BERT scores)
│   │
│   └── QuizTaker.tsx
│       (multi-hop detection & tracking)
│
└── RELATIONSHIP_MASTERY_MIGRATION.sql
    (Supabase table schema)

package.json
  └── @xenova/transformers@2.17.2
      (Transformers.js - browser BERT)
```

---

## 🚀 Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        FRONTEND                               │
│  (Vite + React + TypeScript)                                  │
├───────────────────────────────────────────────────────────────┤
│  • Static hosting (Vercel/Netlify)                            │
│  • BERT runs in browser (Web Worker)                          │
│  • No backend for BERT (fully client-side)                    │
└─────────────────────┬─────────────────────────────────────────┘
                      │
                      ↓
┌───────────────────────────────────────────────────────────────┐
│                     SUPABASE (Backend)                        │
├───────────────────────────────────────────────────────────────┤
│  PostgreSQL Tables:                                           │
│    - users (auth.users)                                       │
│    - documents                                                │
│    - quizzes                                                  │
│    - flashcards                                               │
│    - relationship_mastery ← NEW                               │
│                                                               │
│  RLS Policies:                                                │
│    - User data isolation                                      │
│    - Secure CRUD operations                                   │
│                                                               │
│  Edge Functions (optional):                                   │
│    - Gemini API proxy (hide API keys)                         │
└───────────────────────────────────────────────────────────────┘
                      ↑
                      │
┌─────────────────────┴─────────────────────────────────────────┐
│                   EXTERNAL APIS                               │
├───────────────────────────────────────────────────────────────┤
│  • Google Gemini API (quiz generation)                        │
│  • Transformers.js CDN (BERT model download)                  │
└───────────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Optimization

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  BERT EMBEDDING CACHE (LRU - 1000 entries)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cache Hit:                                                 │
│    encode("Docker") → Check cache → Return immediately      │
│    Time: ~5ms                                               │
│                                                             │
│  Cache Miss:                                                │
│    encode("Kubernetes") → BERT inference → Cache result     │
│    Time: ~20ms (first time), ~5ms (subsequent)              │
│                                                             │
│  Eviction Policy: LRU (Least Recently Used)                 │
│    - Max 1000 entries                                       │
│    - Oldest entry removed when full                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

BERT Model Cache:
  - Stored in browser IndexedDB
  - ~50MB download (one-time)
  - Persists across page reloads
  - Shared across all tabs
```

### Batch Processing

```
Instead of:
  for concept in concepts:
    embedding = await encode(concept)  // 10 x 20ms = 200ms

Use:
  embeddings = await encodeBatch(concepts)  // 1 x 80ms = 80ms
  
Speedup: 2.5x faster
```

---

**Created**: November 7, 2025  
**Version**: 1.0.0  
**Status**: Production-ready ✅
