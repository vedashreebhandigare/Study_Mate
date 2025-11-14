-- ============================================================
-- RELATIONSHIP MASTERY TABLE
-- ============================================================
-- This table tracks user understanding of concept CONNECTIONS
-- (not just isolated concepts). Enables personalized learning
-- recommendations based on weak relationship areas.
--
-- Usage:
-- 1. When user answers multi-hop question with chain [A→B→C]
-- 2. Update mastery for: A→B, B→C, A→C (transitive)
-- 3. Query weak relationships to generate targeted questions
-- ============================================================

-- Create table
CREATE TABLE IF NOT EXISTS relationship_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE, -- NULL = global mastery
  source_concept TEXT NOT NULL,
  target_concept TEXT NOT NULL,
  understanding_score REAL NOT NULL DEFAULT 0.0 CHECK (understanding_score >= 0.0 AND understanding_score <= 1.0),
  times_practiced INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  last_practiced TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique constraint per user + concept pair
  UNIQUE(user_id, source_concept, target_concept)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Index for user queries (most common access pattern)
CREATE INDEX idx_relationship_mastery_user_id 
ON relationship_mastery(user_id);

-- Index for document-specific queries
CREATE INDEX idx_relationship_mastery_document_id 
ON relationship_mastery(document_id);

-- Index for weak relationship queries (personalized recommendations)
CREATE INDEX idx_relationship_mastery_score 
ON relationship_mastery(user_id, understanding_score);

-- Composite index for concept lookups
CREATE INDEX idx_relationship_mastery_concepts 
ON relationship_mastery(source_concept, target_concept);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE relationship_mastery ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own relationship mastery data
CREATE POLICY "Users can view own relationship mastery"
ON relationship_mastery
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own relationship mastery data
CREATE POLICY "Users can create own relationship mastery"
ON relationship_mastery
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own relationship mastery data
CREATE POLICY "Users can update own relationship mastery"
ON relationship_mastery
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own relationship mastery data
CREATE POLICY "Users can delete own relationship mastery"
ON relationship_mastery
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================
-- EXAMPLE QUERIES
-- ============================================================

-- Get all weak relationships for a user (score < 0.6)
-- SELECT * FROM relationship_mastery
-- WHERE user_id = '<user_id>' AND understanding_score < 0.6
-- ORDER BY understanding_score ASC, last_practiced ASC;

-- Get mastery for specific concept pair
-- SELECT * FROM relationship_mastery
-- WHERE user_id = '<user_id>' 
-- AND source_concept = 'Docker' 
-- AND target_concept = 'Kubernetes';

-- Get all relationships for a document
-- SELECT * FROM relationship_mastery
-- WHERE user_id = '<user_id>' AND document_id = '<doc_id>'
-- ORDER BY understanding_score ASC;

-- Count relationships by mastery level
-- SELECT 
--   CASE 
--     WHEN understanding_score < 0.4 THEN 'weak'
--     WHEN understanding_score < 0.7 THEN 'moderate'
--     ELSE 'strong'
--   END as mastery_level,
--   COUNT(*) as count
-- FROM relationship_mastery
-- WHERE user_id = '<user_id>'
-- GROUP BY mastery_level;
