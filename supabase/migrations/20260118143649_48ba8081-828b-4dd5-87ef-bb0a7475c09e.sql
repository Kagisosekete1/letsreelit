-- Add difficulty level and category columns to reels table for tutorial filtering
ALTER TABLE public.reels 
ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS category text DEFAULT 'other' CHECK (category IN ('amapiano', 'hip-hop', 'afrobeats', 'other'));