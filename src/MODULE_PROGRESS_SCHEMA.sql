-- =====================================================
-- MODULE PROGRESS TRACKING - DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Step 1: Add module tracking columns to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS module_id TEXT,
ADD COLUMN IF NOT EXISTS module_topic TEXT;

-- Step 2: Add module tracking columns to flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS module_id TEXT,
ADD COLUMN IF NOT EXISTS module_topic TEXT;

-- Step 3: Create module_progress table
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

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_document ON module_progress(document_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_doc ON module_progress(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_module ON flashcards(module_id);

-- Step 5: Enable RLS (Row Level Security)
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
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

-- Step 7: Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_module_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS module_progress_updated_at ON module_progress;
CREATE TRIGGER module_progress_updated_at
  BEFORE UPDATE ON module_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_module_progress_updated_at();

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify)
-- =====================================================

-- Check if columns were added to quizzes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
AND column_name IN ('module_id', 'module_topic');

-- Check if columns were added to flashcards
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'flashcards' 
AND column_name IN ('module_id', 'module_topic');

-- Check if module_progress table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'module_progress';

-- =====================================================
-- DONE! Module progress tracking is now enabled.
-- =====================================================
