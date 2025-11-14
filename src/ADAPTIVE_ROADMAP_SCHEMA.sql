-- ============================================================
-- ADAPTIVE ROADMAP DATABASE SCHEMA
-- ============================================================
-- Run this SQL in your Supabase SQL Editor to enable the
-- Adaptive Roadmap feature with concept mastery tracking
-- ============================================================

-- 1. Concept Mastery Tracking Table
CREATE TABLE IF NOT EXISTS concept_mastery (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  mastery_score FLOAT NOT NULL DEFAULT 0.0 CHECK (mastery_score >= 0 AND mastery_score <= 1),
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_attempts INTEGER NOT NULL DEFAULT 0,
  last_reviewed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, document_id, concept_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_doc ON concept_mastery(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_score ON concept_mastery(mastery_score);

-- Enable RLS (Row Level Security)
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own concept mastery"
  ON concept_mastery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concept mastery"
  ON concept_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concept mastery"
  ON concept_mastery FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concept mastery"
  ON concept_mastery FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================

-- 2. Study Plans Table
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL, -- Stores the full roadmap JSON
  completed_days INTEGER[] DEFAULT '{}', -- Array of completed day numbers
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, document_id) -- One plan per user per document
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_study_plans_user_doc ON study_plans(user_id, document_id);

-- Enable RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own study plans"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plans"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================

-- 3. Optional: View for analytics
CREATE OR REPLACE VIEW concept_mastery_stats AS
SELECT 
  user_id,
  document_id,
  COUNT(*) as total_concepts,
  AVG(mastery_score) as avg_mastery,
  COUNT(CASE WHEN mastery_score < 0.7 THEN 1 END) as weak_concepts,
  COUNT(CASE WHEN mastery_score >= 0.7 AND mastery_score < 0.9 THEN 1 END) as moderate_concepts,
  COUNT(CASE WHEN mastery_score >= 0.9 THEN 1 END) as strong_concepts
FROM concept_mastery
GROUP BY user_id, document_id;

-- ============================================================

-- 🎉 DONE! Your Adaptive Roadmap tables are ready!
-- ============================================================
-- Next Steps:
-- 1. Complete a quiz or flashcard session
-- 2. Go to Dashboard → Select a document
-- 3. Click "Generate Roadmap" in the Adaptive Roadmap card
-- 4. Get your personalized 5-day study plan!
-- ============================================================
