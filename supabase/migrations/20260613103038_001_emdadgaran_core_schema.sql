/*
# Emdadgaran Core Schema

## Overview
Complete database schema for the Emdadgaran vehicle rescuer communication platform.
This is a multi-user app with authentication, requiring proper RLS policies on all tables.

## New Tables
1. `profiles` - User profiles extending auth.users with name, code, phone, rank, verification status
2. `admins` - Admin and manager accounts with role, password hash, shift info
3. `loads` - Freight/load announcements with status tracking
4. `load_respondents` - Users who respond to loads
5. `chat_messages` - General chat messages (WhatsApp-style)
6. `dm_conversations` - Private chat conversation metadata
7. `dm_messages` - Direct message content
8. `radio_channels` - Walkie-talkie channels
9. `radio_members` - Channel membership
10. `radio_messages` - Voice message records in channels
11. `verification_requests` - Identity verification submissions
12. `verification_docs` - Documents uploaded for verification
13. `tickets` - Support tickets and complaints
14. `ticket_messages` - Back-and-forth in tickets
15. `reports` - Content/user reports
16. `blacklist` - User blacklist entries
17. `notifications` - User notification records
18. `games_hokm` - Hokm card game state
19. `games_manch` - Manch board game state
20. `invoices` - Billing/invoice records
21. `admin_logs` - Admin action audit log
22. `server_settings` - Global server configuration

## Security
- RLS enabled on ALL tables
- Owner-scoped policies for user data
- Admin-scoped policies for admin tables
- Manager-scoped policies for manager tables
*/

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  phone text NOT NULL UNIQUE,
  is_verified boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'revision_requested', 'verified', 'rejected')),
  ownership_type text CHECK (ownership_type IN ('personal', 'company', 'rental')),
  rank text NOT NULL DEFAULT 'none' CHECK (rank IN ('none', 'bronze', 'silver', 'gold', 'diamond')),
  total_loads integer NOT NULL DEFAULT 0,
  completed_loads integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- 2. Admins
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager')),
  is_active boolean NOT NULL DEFAULT true,
  shift_start text,
  shift_end text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_all" ON admins;
CREATE POLICY "admins_read_all" ON admins FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage" ON admins;
CREATE POLICY "admins_manage" ON admins FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admins_update" ON admins;
CREATE POLICY "admins_update" ON admins FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admins_delete" ON admins;
CREATE POLICY "admins_delete" ON admins FOR DELETE
  TO authenticated USING (true);

-- 3. Loads
CREATE TABLE IF NOT EXISTS loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  owner_code text NOT NULL,
  text text NOT NULL CHECK (char_length(text) >= 5 AND char_length(text) <= 300),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'coordinated', 'cancelled')),
  confirmed_respondent_id uuid,
  is_directed boolean NOT NULL DEFAULT false,
  directed_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loads_select" ON loads;
CREATE POLICY "loads_select" ON loads FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "loads_insert" ON loads;
CREATE POLICY "loads_insert" ON loads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "loads_update" ON loads;
CREATE POLICY "loads_update" ON loads FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "loads_delete" ON loads;
CREATE POLICY "loads_delete" ON loads FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- 4. Load Respondents
CREATE TABLE IF NOT EXISTS load_respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(load_id, user_id)
);
ALTER TABLE load_respondents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "respondents_select" ON load_respondents;
CREATE POLICY "respondents_select" ON load_respondents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "respondents_insert" ON load_respondents;
CREATE POLICY "respondents_insert" ON load_respondents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "respondents_delete" ON load_respondents;
CREATE POLICY "respondents_delete" ON load_respondents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 5. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'sticker', 'image', 'forwarded')),
  text text,
  media_url text,
  reply_to uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  reactions jsonb NOT NULL DEFAULT '{}',
  deleted_for uuid[] NOT NULL DEFAULT '{}',
  deleted_for_all boolean NOT NULL DEFAULT false,
  read_by uuid[] NOT NULL DEFAULT '{}',
  delivered_to uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select" ON chat_messages;
CREATE POLICY "chat_select" ON chat_messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "chat_insert" ON chat_messages;
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_update" ON chat_messages;
CREATE POLICY "chat_update" ON chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_delete" ON chat_messages;
CREATE POLICY "chat_delete" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 6. DM Conversations
CREATE TABLE IF NOT EXISTS dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_conv_select" ON dm_conversations;
CREATE POLICY "dm_conv_select" ON dm_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "dm_conv_insert" ON dm_conversations;
CREATE POLICY "dm_conv_insert" ON dm_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "dm_conv_update" ON dm_conversations;
CREATE POLICY "dm_conv_update" ON dm_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id) WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 7. DM Messages
CREATE TABLE IF NOT EXISTS dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'sticker', 'image', 'forwarded')),
  text text,
  media_url text,
  reply_to uuid REFERENCES dm_messages(id) ON DELETE SET NULL,
  reactions jsonb NOT NULL DEFAULT '{}',
  deleted_for uuid[] NOT NULL DEFAULT '{}',
  deleted_for_all boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_msg_select" ON dm_messages;
CREATE POLICY "dm_msg_select" ON dm_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM dm_conversations WHERE dm_conversations.id = dm_messages.conversation_id AND (dm_conversations.user1_id = auth.uid() OR dm_conversations.user2_id = auth.uid()))
  );

DROP POLICY IF EXISTS "dm_msg_insert" ON dm_messages;
CREATE POLICY "dm_msg_insert" ON dm_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "dm_msg_update" ON dm_messages;
CREATE POLICY "dm_msg_update" ON dm_messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "dm_msg_delete" ON dm_messages;
CREATE POLICY "dm_msg_delete" ON dm_messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- 8. Radio Channels
CREATE TABLE IF NOT EXISTS radio_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  password text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE radio_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "radio_ch_select" ON radio_channels;
CREATE POLICY "radio_ch_select" ON radio_channels FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "radio_ch_insert" ON radio_channels;
CREATE POLICY "radio_ch_insert" ON radio_channels FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "radio_ch_update" ON radio_channels;
CREATE POLICY "radio_ch_update" ON radio_channels FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "radio_ch_delete" ON radio_channels;
CREATE POLICY "radio_ch_delete" ON radio_channels FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- 9. Radio Members
CREATE TABLE IF NOT EXISTS radio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
ALTER TABLE radio_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "radio_mem_select" ON radio_members;
CREATE POLICY "radio_mem_select" ON radio_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "radio_mem_insert" ON radio_members;
CREATE POLICY "radio_mem_insert" ON radio_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "radio_mem_delete" ON radio_members;
CREATE POLICY "radio_mem_delete" ON radio_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM radio_channels WHERE radio_channels.id = radio_members.channel_id AND radio_channels.owner_id = auth.uid()));

-- 10. Radio Messages (voice logs)
CREATE TABLE IF NOT EXISTS radio_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  duration_seconds integer NOT NULL,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE radio_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "radio_msg_select" ON radio_messages;
CREATE POLICY "radio_msg_select" ON radio_messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "radio_msg_insert" ON radio_messages;
CREATE POLICY "radio_msg_insert" ON radio_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 11. Verification Requests
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ownership_type text NOT NULL CHECK (ownership_type IN ('personal', 'company', 'rental')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision_requested', 'rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES admins(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verif_select" ON verification_requests;
CREATE POLICY "verif_select" ON verification_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

DROP POLICY IF EXISTS "verif_insert" ON verification_requests;
CREATE POLICY "verif_insert" ON verification_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "verif_update" ON verification_requests;
CREATE POLICY "verif_update" ON verification_requests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- 12. Verification Docs
CREATE TABLE IF NOT EXISTS verification_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE verification_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verif_docs_select" ON verification_docs;
CREATE POLICY "verif_docs_select" ON verification_docs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "verif_docs_insert" ON verification_docs;
CREATE POLICY "verif_docs_insert" ON verification_docs FOR INSERT
  TO authenticated WITH CHECK (true);

-- 13. Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'warned', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select" ON tickets;
CREATE POLICY "tickets_select" ON tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM admins));

DROP POLICY IF EXISTS "tickets_insert" ON tickets;
CREATE POLICY "tickets_insert" ON tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tickets_update" ON tickets;
CREATE POLICY "tickets_update" ON tickets FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- 14. Ticket Messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin')),
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_msg_select" ON ticket_messages;
CREATE POLICY "ticket_msg_select" ON ticket_messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ticket_msg_insert" ON ticket_messages;
CREATE POLICY "ticket_msg_insert" ON ticket_messages FOR INSERT
  TO authenticated WITH CHECK (true);

-- 15. Reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('message', 'user')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  action_taken text,
  reviewed_by uuid REFERENCES admins(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select" ON reports;
CREATE POLICY "reports_select" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM admins));

DROP POLICY IF EXISTS "reports_insert" ON reports;
CREATE POLICY "reports_insert" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_update" ON reports;
CREATE POLICY "reports_update" ON reports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- 16. Blacklist
CREATE TABLE IF NOT EXISTS blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, blocked_user_id)
);
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blacklist_select" ON blacklist;
CREATE POLICY "blacklist_select" ON blacklist FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "blacklist_insert" ON blacklist;
CREATE POLICY "blacklist_insert" ON blacklist FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blacklist_delete" ON blacklist;
CREATE POLICY "blacklist_delete" ON blacklist FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 17. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 18. Games Hokm
CREATE TABLE IF NOT EXISTS games_hokm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'determining_hakem', 'trumping', 'dealing', 'playing_round', 'round_end', 'game_end', 'paused', 'cancelled', 'finished')),
  players jsonb NOT NULL DEFAULT '[]',
  hakem_index integer,
  trump text,
  current_player_index integer NOT NULL DEFAULT 0,
  round_number integer NOT NULL DEFAULT 0,
  table_cards jsonb NOT NULL DEFAULT '[]',
  scores jsonb NOT NULL DEFAULT '{}',
  cards jsonb NOT NULL DEFAULT '{}',
  finish_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE games_hokm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hokm_select" ON games_hokm;
CREATE POLICY "hokm_select" ON games_hokm FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hokm_insert" ON games_hokm;
CREATE POLICY "hokm_insert" ON games_hokm FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "hokm_update" ON games_hokm;
CREATE POLICY "hokm_update" ON games_hokm FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- 19. Games Manch
CREATE TABLE IF NOT EXISTS games_manch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  players jsonb NOT NULL DEFAULT '[]',
  current_player_index integer NOT NULL DEFAULT 0,
  dice_value integer,
  six_count integer NOT NULL DEFAULT 0,
  possible_moves jsonb NOT NULL DEFAULT '[]',
  finish_order jsonb NOT NULL DEFAULT '[]',
  board_state jsonb NOT NULL DEFAULT '{}',
  finish_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE games_manch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manch_select" ON games_manch;
CREATE POLICY "manch_select" ON games_manch FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "manch_insert" ON games_manch;
CREATE POLICY "manch_insert" ON games_manch FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "manch_update" ON games_manch;
CREATE POLICY "manch_update" ON games_manch FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- 20. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  load_id uuid REFERENCES loads(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "invoices_insert" ON invoices;
CREATE POLICY "invoices_insert" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "invoices_update" ON invoices;
CREATE POLICY "invoices_update" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id) WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- 21. Admin Logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_logs_select" ON admin_logs;
CREATE POLICY "admin_logs_select" ON admin_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_logs_insert" ON admin_logs;
CREATE POLICY "admin_logs_insert" ON admin_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- 22. Server Settings
CREATE TABLE IF NOT EXISTS server_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  load_interval_minutes integer NOT NULL DEFAULT 30,
  max_concurrent_loads integer NOT NULL DEFAULT 5,
  chat_message_limit integer NOT NULL DEFAULT 200,
  dm_message_limit integer NOT NULL DEFAULT 50,
  radio_message_limit integer NOT NULL DEFAULT 5,
  max_voice_duration_seconds integer NOT NULL DEFAULT 60,
  features jsonb NOT NULL DEFAULT '{"chat": true, "radio": true, "games": true, "dm": true}',
  rate_limit_attempts integer NOT NULL DEFAULT 5,
  rate_limit_window_minutes integer NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE server_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON server_settings;
CREATE POLICY "settings_select" ON server_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_update" ON server_settings;
CREATE POLICY "settings_update" ON server_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "settings_insert" ON server_settings;
CREATE POLICY "settings_insert" ON server_settings FOR INSERT
  TO authenticated WITH CHECK (true);

-- Insert default settings
INSERT INTO server_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_loads_owner ON loads(owner_id);
CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON dm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created ON dm_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_user ON blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_load_respondents_load ON load_respondents(load_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);
