-- 🗺️ ADAPTIVE MODULAR ROADMAP SCHEMA
-- Create module_progress table for tracking learning module performance

-- Create module_progress table
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL, -- e.g., "module-1", "module-2"
  
  -- Progress tracking
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in-progress', 'needs-review', 'mastered')),
  mastery_score FLOAT DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
  
  -- Quiz metrics
  quiz_attempts INTEGER DEFAULT 0,
  quiz_average_score FLOAT DEFAULT 0,
  
  -- Flashcard metrics
  flashcard_reviews INTEGER DEFAULT 0,
  flashcard_retention FLOAT DEFAULT 0,
  
  -- Tutor metrics
  tutor_questions_asked INTEGER DEFAULT 0,
  
  -- Timestamps
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one progress record per module per user per document
  UNIQUE(user_id, document_id, module_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_module_progress_user_doc ON module_progress(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_status ON module_progress(status);

-- Add plan_type column to study_plans if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'study_plans' 
    AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE study_plans ADD COLUMN plan_type TEXT DEFAULT 'legacy';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own module progress"
  ON module_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own module progress"
  ON module_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own module progress"
  ON module_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own module progress"
  ON module_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON module_progress TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Adaptive Modular Roadmap schema created successfully!';
  RAISE NOTICE 'Tables created: module_progress';
  RAISE NOTICE 'Study plans now support plan_type to distinguish adaptive vs legacy roadmaps';
END $$;
