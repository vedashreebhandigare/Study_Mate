-- ============================================================
-- COMPREHENSIVE SCHEMA FIX - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================
-- This SQL script fixes all schema-related errors including:
-- 1. Module progress table with all required columns
-- 2. Study plans table with proper unique constraints
-- 3. Concept mastery tracking
-- 4. All necessary indexes and RLS policies
-- ============================================================

-- ============================================================
-- PART 1: MODULE PROGRESS TABLE
-- ============================================================

-- Create module_progress table (if not exists)
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  module_title TEXT NOT NULL,
  module_topics TEXT[], -- Array of topic strings
  mastery_score DECIMAL DEFAULT 0,
  quizzes_completed INT DEFAULT 0,
  quizzes_total INT DEFAULT 5,
  flashcards_completed INT DEFAULT 0,
  flashcards_total INT DEFAULT 10,
  is_unlocked BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  content_generated BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, document_id, module_id)
);

-- Add module tracking columns to quizzes table (if not exists)
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS module_id TEXT,
ADD COLUMN IF NOT EXISTS module_topic TEXT;

-- Add module tracking columns to flashcards table (if not exists)
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS module_id TEXT,
ADD COLUMN IF NOT EXISTS module_topic TEXT;

-- Create indexes for module_progress
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_document ON module_progress(document_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_doc ON module_progress(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_module ON flashcards(module_id);

-- Enable RLS on module_progress
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for module_progress
DROP POLICY IF EXISTS "Users can view own module progress" ON module_progress;
CREATE POLICY "Users can view own module progress" ON module_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own module progress" ON module_progress;
CREATE POLICY "Users can insert own module progress" ON module_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own module progress" ON module_progress;
CREATE POLICY "Users can update own module progress" ON module_progress
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own module progress" ON module_progress;
CREATE POLICY "Users can delete own module progress" ON module_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_module_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS module_progress_updated_at ON module_progress;
CREATE TRIGGER module_progress_updated_at
  BEFORE UPDATE ON module_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_module_progress_updated_at();

-- ============================================================
-- PART 2: STUDY PLANS TABLE (ADAPTIVE ROADMAP)
-- ============================================================

-- Create study_plans table (if not exists)
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  plan_type TEXT DEFAULT 'adaptive_modular',
  completed_days INTEGER[] DEFAULT '{}',
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, document_id)
);

-- Add plan_type column if it doesn't exist (for existing tables)
ALTER TABLE study_plans 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'adaptive_modular';

-- Create indexes for study_plans
CREATE INDEX IF NOT EXISTS idx_study_plans_user_doc ON study_plans(user_id, document_id);

-- Enable RLS on study_plans
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study_plans
DROP POLICY IF EXISTS "Users can view their own study plans" ON study_plans;
CREATE POLICY "Users can view their own study plans"
  ON study_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own study plans" ON study_plans;
CREATE POLICY "Users can insert their own study plans"
  ON study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own study plans" ON study_plans;
CREATE POLICY "Users can update their own study plans"
  ON study_plans FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own study plans" ON study_plans;
CREATE POLICY "Users can delete their own study plans"
  ON study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- PART 3: CONCEPT MASTERY TABLE
-- ============================================================

-- Create concept_mastery table (if not exists)
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

-- Create indexes for concept_mastery
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_doc ON concept_mastery(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_score ON concept_mastery(mastery_score);

-- Enable RLS on concept_mastery
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for concept_mastery
DROP POLICY IF EXISTS "Users can view their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can view their own concept mastery"
  ON concept_mastery FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can insert their own concept mastery"
  ON concept_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can update their own concept mastery"
  ON concept_mastery FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can delete their own concept mastery"
  ON concept_mastery FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- PART 4: ANALYTICS VIEW
-- ============================================================

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
-- VERIFICATION QUERIES
-- ============================================================

-- Check module_progress table
SELECT 'module_progress' as table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'module_progress';

-- Check study_plans table
SELECT 'study_plans' as table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'study_plans';

-- Check concept_mastery table
SELECT 'concept_mastery' as table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'concept_mastery';

-- Check module columns on quizzes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
AND column_name IN ('module_id', 'module_topic');

-- Check module columns on flashcards
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'flashcards' 
AND column_name IN ('module_id', 'module_topic');

-- ============================================================
-- 🎉 ALL DONE! Your database schema is now complete!
-- ============================================================
-- The following features are now enabled:
-- ✅ Module-based learning with progress tracking
-- ✅ Adaptive roadmap generation and storage
-- ✅ Concept mastery tracking for personalized learning
-- ✅ All necessary indexes for performance
-- ✅ Row Level Security for data protection
-- ============================================================
