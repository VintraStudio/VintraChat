-- Fix schema alignment between database and application code
-- This migration adds missing columns and ensures all references work correctly.

-- 1. admin_profiles: Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'admin_profiles' AND column_name = 'email_notifications') THEN
    ALTER TABLE public.admin_profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'admin_profiles' AND column_name = 'timezone') THEN
    ALTER TABLE public.admin_profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'admin_profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.admin_profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 2. chat_sessions: Add created_at column that mirrors started_at for code compatibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'chat_sessions' AND column_name = 'created_at') THEN
    ALTER TABLE public.chat_sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    -- Copy existing started_at values to created_at
    UPDATE public.chat_sessions SET created_at = started_at WHERE created_at IS NULL AND started_at IS NOT NULL;
  END IF;
END $$;

-- 3. canned_responses: Add admin_id column for direct admin reference
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'canned_responses' AND column_name = 'admin_id') THEN
    ALTER TABLE public.canned_responses ADD COLUMN admin_id UUID REFERENCES auth.users(id);
    -- Populate admin_id from chatbot_configs
    UPDATE public.canned_responses cr
    SET admin_id = cc.admin_id
    FROM public.chatbot_configs cc
    WHERE cr.chatbot_id = cc.id AND cr.admin_id IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'canned_responses' AND column_name = 'category') THEN
    ALTER TABLE public.canned_responses ADD COLUMN category TEXT;
  END IF;
END $$;

-- Make canned_responses.shortcut nullable (code allows null shortcuts)
ALTER TABLE public.canned_responses ALTER COLUMN shortcut DROP NOT NULL;

-- Make canned_responses.chatbot_id nullable (code uses admin_id directly)
ALTER TABLE public.canned_responses ALTER COLUMN chatbot_id DROP NOT NULL;

-- 4. Add RLS policies for admin_id based access on canned_responses
DROP POLICY IF EXISTS "canned_responses_select_by_admin" ON public.canned_responses;
CREATE POLICY "canned_responses_select_by_admin" ON public.canned_responses 
  FOR SELECT USING (admin_id = auth.uid() OR chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid()));

DROP POLICY IF EXISTS "canned_responses_insert_by_admin" ON public.canned_responses;
CREATE POLICY "canned_responses_insert_by_admin" ON public.canned_responses 
  FOR INSERT WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "canned_responses_update_by_admin" ON public.canned_responses;
CREATE POLICY "canned_responses_update_by_admin" ON public.canned_responses 
  FOR UPDATE USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "canned_responses_delete_by_admin" ON public.canned_responses;
CREATE POLICY "canned_responses_delete_by_admin" ON public.canned_responses 
  FOR DELETE USING (admin_id = auth.uid());

-- 5. Add RLS policies for admin_id based access on chat_sessions
DROP POLICY IF EXISTS "chat_sessions_select_by_admin" ON public.chat_sessions;
CREATE POLICY "chat_sessions_select_by_admin" ON public.chat_sessions 
  FOR SELECT USING (
    admin_id = auth.uid() 
    OR chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "chat_sessions_update_by_admin" ON public.chat_sessions;
CREATE POLICY "chat_sessions_update_by_admin" ON public.chat_sessions 
  FOR UPDATE USING (
    admin_id = auth.uid() 
    OR chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "chat_sessions_delete_by_admin" ON public.chat_sessions;
CREATE POLICY "chat_sessions_delete_by_admin" ON public.chat_sessions 
  FOR DELETE USING (
    admin_id = auth.uid() 
    OR chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid())
  );

-- 6. Add RLS policies for admin_id based access on chat_messages
DROP POLICY IF EXISTS "chat_messages_select_by_admin" ON public.chat_messages;
CREATE POLICY "chat_messages_select_by_admin" ON public.chat_messages 
  FOR SELECT USING (
    admin_id = auth.uid() 
    OR session_id IN (
      SELECT cs.id FROM public.chat_sessions cs 
      WHERE cs.admin_id = auth.uid() 
      OR cs.chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_messages_delete_by_admin" ON public.chat_messages;
CREATE POLICY "chat_messages_delete_by_admin" ON public.chat_messages 
  FOR DELETE USING (
    admin_id = auth.uid() 
    OR session_id IN (
      SELECT cs.id FROM public.chat_sessions cs 
      WHERE cs.admin_id = auth.uid() 
      OR cs.chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid())
    )
  );

-- 7. Add analytics_events RLS for admin_id
DROP POLICY IF EXISTS "analytics_events_select_by_admin" ON public.analytics_events;
CREATE POLICY "analytics_events_select_by_admin" ON public.analytics_events 
  FOR SELECT USING (
    admin_id = auth.uid() 
    OR chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid())
  );

-- 8. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_canned_responses_admin_id ON public.canned_responses(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_admin_id ON public.chat_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON public.chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_admin_id ON public.chat_messages(admin_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_admin_id ON public.analytics_events(admin_id);
