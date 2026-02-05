-- Add public read policies for widget functionality
-- These allow anonymous users (the chat widget) to read chatbot configs and interact with chat

-- Allow anyone to read active chatbot configs (for widget initialization)
DROP POLICY IF EXISTS "chatbot_configs_public_read" ON public.chatbot_configs;
CREATE POLICY "chatbot_configs_public_read" ON public.chatbot_configs 
  FOR SELECT 
  USING (is_active = true);

-- Allow anyone to read chat sessions by session ID (for the widget)
DROP POLICY IF EXISTS "chat_sessions_public_read" ON public.chat_sessions;
CREATE POLICY "chat_sessions_public_read" ON public.chat_sessions 
  FOR SELECT 
  USING (true);

-- Allow anyone to insert chat sessions (visitors starting chats)
DROP POLICY IF EXISTS "chat_sessions_public_insert" ON public.chat_sessions;
CREATE POLICY "chat_sessions_public_insert" ON public.chat_sessions 
  FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to read chat messages for a session
DROP POLICY IF EXISTS "chat_messages_public_read" ON public.chat_messages;
CREATE POLICY "chat_messages_public_read" ON public.chat_messages 
  FOR SELECT 
  USING (true);

-- Allow anyone to insert chat messages (visitors sending messages)
DROP POLICY IF EXISTS "chat_messages_public_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_public_insert" ON public.chat_messages 
  FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to insert analytics events
DROP POLICY IF EXISTS "analytics_events_public_insert" ON public.analytics_events;
CREATE POLICY "analytics_events_public_insert" ON public.analytics_events 
  FOR INSERT 
  WITH CHECK (true);

-- Add admin_id column to chat_sessions and chat_messages if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chat_sessions' AND column_name = 'admin_id') THEN
    ALTER TABLE public.chat_sessions ADD COLUMN admin_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chat_messages' AND column_name = 'admin_id') THEN
    ALTER TABLE public.chat_messages ADD COLUMN admin_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'analytics_events' AND column_name = 'admin_id') THEN
    ALTER TABLE public.analytics_events ADD COLUMN admin_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chat_sessions' AND column_name = 'updated_at') THEN
    ALTER TABLE public.chat_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chat_sessions' AND column_name = 'metadata') THEN
    ALTER TABLE public.chat_sessions ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chatbot_configs' AND column_name = 'widget_title') THEN
    ALTER TABLE public.chatbot_configs ADD COLUMN widget_title TEXT DEFAULT 'Chat with us';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chatbot_configs' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.chatbot_configs ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Allow anyone to update chat sessions (for updating last_message_at)
DROP POLICY IF EXISTS "chat_sessions_public_update" ON public.chat_sessions;
CREATE POLICY "chat_sessions_public_update" ON public.chat_sessions 
  FOR UPDATE 
  USING (true);
