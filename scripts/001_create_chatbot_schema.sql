-- VintraStudio Chatbot System Database Schema

-- Admin profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chatbot configurations table
CREATE TABLE IF NOT EXISTS public.chatbot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Chatbot',
  welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
  placeholder_text TEXT DEFAULT 'Type your message...',
  primary_color TEXT DEFAULT '#0066FF',
  secondary_color TEXT DEFAULT '#F0F4FF',
  text_color TEXT DEFAULT '#1A1A2E',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  widget_size TEXT DEFAULT 'medium' CHECK (widget_size IN ('small', 'medium', 'large')),
  show_branding BOOLEAN DEFAULT true,
  auto_open_delay INTEGER DEFAULT 0,
  offline_message TEXT DEFAULT 'We are currently offline. Please leave a message.',
  is_active BOOLEAN DEFAULT true,
  api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  allowed_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id UUID NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'admin', 'bot')),
  sender_id TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Canned responses table
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id UUID NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_id UUID NOT NULL REFERENCES public.chatbot_configs(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin profiles policies
CREATE POLICY "admin_profiles_select_own" ON public.admin_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admin_profiles_insert_own" ON public.admin_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "admin_profiles_update_own" ON public.admin_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admin_profiles_delete_own" ON public.admin_profiles FOR DELETE USING (auth.uid() = id);

-- Chatbot configs policies
CREATE POLICY "chatbot_configs_select_own" ON public.chatbot_configs FOR SELECT USING (auth.uid() = admin_id);
CREATE POLICY "chatbot_configs_insert_own" ON public.chatbot_configs FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "chatbot_configs_update_own" ON public.chatbot_configs FOR UPDATE USING (auth.uid() = admin_id);
CREATE POLICY "chatbot_configs_delete_own" ON public.chatbot_configs FOR DELETE USING (auth.uid() = admin_id);

-- Chat sessions policies (admin can see their chatbot sessions)
CREATE POLICY "chat_sessions_select" ON public.chat_sessions FOR SELECT 
  USING (chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid()));
CREATE POLICY "chat_sessions_insert" ON public.chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_sessions_update" ON public.chat_sessions FOR UPDATE 
  USING (chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid()));

-- Chat messages policies
CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT 
  USING (session_id IN (
    SELECT cs.id FROM public.chat_sessions cs 
    JOIN public.chatbot_configs cc ON cs.chatbot_id = cc.id 
    WHERE cc.admin_id = auth.uid()
  ));
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_messages_update" ON public.chat_messages FOR UPDATE 
  USING (session_id IN (
    SELECT cs.id FROM public.chat_sessions cs 
    JOIN public.chatbot_configs cc ON cs.chatbot_id = cc.id 
    WHERE cc.admin_id = auth.uid()
  ));

-- Canned responses policies
CREATE POLICY "canned_responses_select" ON public.canned_responses FOR SELECT 
  USING (chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid()));
CREATE POLICY "canned_responses_insert" ON public.canned_responses FOR INSERT 
  WITH CHECK (chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid()));
CREATE POLICY "canned_responses_update" ON public.canned_responses FOR UPDATE 
  USING (chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid()));
CREATE POLICY "canned_responses_delete" ON public.canned_responses FOR DELETE 
  USING (chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid()));

-- Analytics events policies
CREATE POLICY "analytics_events_select" ON public.analytics_events FOR SELECT 
  USING (chatbot_id IN (SELECT id FROM public.chatbot_configs WHERE admin_id = auth.uid()));
CREATE POLICY "analytics_events_insert" ON public.analytics_events FOR INSERT WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chatbot_configs_admin_id ON public.chatbot_configs(admin_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_configs_api_key ON public.chatbot_configs(api_key);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_chatbot_id ON public.chat_sessions(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor_id ON public.chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_chatbot_id ON public.analytics_events(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Trigger to auto-create admin profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_profiles (id, full_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'company_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create a default chatbot config for new admin
  INSERT INTO public.chatbot_configs (admin_id, name)
  VALUES (NEW.id, 'My First Chatbot');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update triggers
DROP TRIGGER IF EXISTS update_admin_profiles_updated_at ON public.admin_profiles;
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_chatbot_configs_updated_at ON public.chatbot_configs;
CREATE TRIGGER update_chatbot_configs_updated_at
  BEFORE UPDATE ON public.chatbot_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
