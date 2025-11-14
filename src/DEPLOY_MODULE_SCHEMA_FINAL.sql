-- ============================================================
-- 🚀 FINAL MODULE SYSTEM SCHEMA - DEPLOY THIS IN SUPABASE
-- ============================================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Create new query
-- 3. Paste this ENTIRE file
-- 4. Click "Run" (or press Cmd/Ctrl + Enter)
-- 5. Check the output at the bottom - you should see success messages
-- ============================================================

-- ============================================================
-- STEP 1: DROP EXISTING TABLES (Clean Slate)
-- ============================================================
-- This ensures no conflicts from previous attempts
-- ============================================================

DROP TABLE IF EXISTS module_progress CASCADE;
DROP TABLE IF EXISTS concept_mastery CASCADE;
DROP VIEW IF EXISTS concept_mastery_stats CASCADE;

-- ============================================================
-- STEP 2: CREATE MODULE_PROGRESS TABLE
-- ============================================================
-- This is the main table for tracking module learning progress
-- ============================================================

CREATE TABLE module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  module_title TEXT NOT NULL,
  module_topics TEXT[] DEFAULT '{}',
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

-- ============================================================
-- STEP 3: ADD MODULE COLUMNS TO EXISTING TABLES
-- ============================================================
-- Add module tracking to quizzes and flashcards
-- ============================================================

-- Add to quizzes table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quizzes' AND column_name = 'module_id'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN module_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quizzes' AND column_name = 'module_topic'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN module_topic TEXT;
  END IF;
END $$;

-- Add to flashcards table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flashcards' AND column_name = 'module_id'
  ) THEN
    ALTER TABLE flashcards ADD COLUMN module_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flashcards' AND column_name = 'module_topic'
  ) THEN
    ALTER TABLE flashcards ADD COLUMN module_topic TEXT;
  END IF;
END $$;

-- ============================================================
-- STEP 4: CREATE STUDY_PLANS TABLE (IF NEEDED)
-- ============================================================

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

-- Add plan_type if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_plans' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE study_plans ADD COLUMN plan_type TEXT DEFAULT 'adaptive_modular';
  END IF;
END $$;

-- ============================================================
-- STEP 5: CREATE CONCEPT_MASTERY TABLE
-- ============================================================

CREATE TABLE concept_mastery (
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

-- ============================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_document ON module_progress(document_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_doc ON module_progress(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_module ON flashcards(module_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_doc ON study_plans(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_doc ON concept_mastery(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_score ON concept_mastery(mastery_score);

-- ============================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 8: CREATE RLS POLICIES - MODULE_PROGRESS
-- ============================================================

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

-- ============================================================
-- STEP 9: CREATE RLS POLICIES - STUDY_PLANS
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own study plans" ON study_plans;
CREATE POLICY "Users can view their own study plans" ON study_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own study plans" ON study_plans;
CREATE POLICY "Users can insert their own study plans" ON study_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own study plans" ON study_plans;
CREATE POLICY "Users can update their own study plans" ON study_plans
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own study plans" ON study_plans;
CREATE POLICY "Users can delete their own study plans" ON study_plans
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STEP 10: CREATE RLS POLICIES - CONCEPT_MASTERY
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can view their own concept mastery" ON concept_mastery
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can insert their own concept mastery" ON concept_mastery
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can update their own concept mastery" ON concept_mastery
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own concept mastery" ON concept_mastery;
CREATE POLICY "Users can delete their own concept mastery" ON concept_mastery
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STEP 11: CREATE TRIGGERS AND FUNCTIONS
-- ============================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_module_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS module_progress_updated_at ON module_progress;
CREATE TRIGGER module_progress_updated_at
  BEFORE UPDATE ON module_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_module_progress_updated_at();

-- ============================================================
-- STEP 12: CREATE ANALYTICS VIEW
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
-- ✅ VERIFICATION: Check if everything was created correctly
-- ============================================================

-- Check module_progress table structure
SELECT '✅ MODULE_PROGRESS TABLE' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'module_progress'
ORDER BY ordinal_position;

-- Check study_plans table structure
SELECT '✅ STUDY_PLANS TABLE' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'study_plans'
ORDER BY ordinal_position;

-- Check concept_mastery table structure
SELECT '✅ CONCEPT_MASTERY TABLE' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'concept_mastery'
ORDER BY ordinal_position;

-- Check module columns on quizzes
SELECT '✅ QUIZZES MODULE COLUMNS' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
AND column_name IN ('module_id', 'module_topic');

-- Check module columns on flashcards
SELECT '✅ FLASHCARDS MODULE COLUMNS' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'flashcards' 
AND column_name IN ('module_id', 'module_topic');

-- Count indexes
SELECT '✅ INDEXES CREATED' as status;
SELECT COUNT(*) as index_count
FROM pg_indexes 
WHERE tablename IN ('module_progress', 'study_plans', 'concept_mastery', 'quizzes', 'flashcards')
AND indexname LIKE 'idx_%';

-- Check RLS policies
SELECT '✅ RLS POLICIES' as status;
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('module_progress', 'study_plans', 'concept_mastery')
ORDER BY tablename, policyname;

-- ============================================================
-- 🎉 DEPLOYMENT COMPLETE!
-- ============================================================
-- ✅ module_progress table created with all columns including module_title
-- ✅ study_plans table ready for adaptive roadmaps
-- ✅ concept_mastery table ready for learning analytics
-- ✅ Indexes created for optimal performance
-- ✅ Row Level Security enabled for data protection
-- ✅ All RLS policies configured
-- ============================================================
-- 
-- NEXT STEPS:
-- 1. Scroll down to see the verification results
-- 2. Confirm you see "module_title" in the module_progress columns
-- 3. Your module system is now fully operational! 🚀
-- ============================================================
