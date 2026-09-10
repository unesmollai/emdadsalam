export interface Profile {
  id: string;
  name: string;
  code: string;
  phone: string;
  is_verified: boolean;
  verification_status: 'unverified' | 'pending' | 'revision_requested' | 'verified' | 'rejected';
  ownership_type: 'personal' | 'company' | 'rental' | null;
  rank: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
  total_loads: number;
  completed_loads: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  username: string;
  role: 'admin' | 'manager';
  is_active: boolean;
  shift_start: string | null;
  shift_end: string | null;
  created_at: string;
}

export interface Load {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_code: string;
  text: string;
  status: 'active' | 'in_progress' | 'coordinated' | 'cancelled';
  confirmed_respondent_id: string | null;
  is_directed: boolean;
  directed_to: string | null;
  created_at: string;
  updated_at: string;
  respondents?: LoadRespondent[];
}

export interface LoadRespondent {
  id: string;
  load_id: string;
  user_id: string;
  user_name: string;
  user_code: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  type: 'text' | 'sticker' | 'image' | 'forwarded';
  text: string | null;
  media_url: string | null;
  reply_to: string | null;
  reactions: Record<string, string[]>;
  deleted_for: string[];
  deleted_for_all: boolean;
  read_by: string[];
  delivered_to: string[];
  created_at: string;
}

export interface DMConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
  otherUser?: Profile;
}

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'sticker' | 'image' | 'forwarded';
  text: string | null;
  media_url: string | null;
  reply_to: string | null;
  reactions: Record<string, string[]>;
  deleted_for: string[];
  deleted_for_all: boolean;
  read: boolean;
  created_at: string;
}

export interface RadioChannel {
  id: string;
  name: string;
  owner_id: string;
  password: string | null;
  created_at: string;
  members?: RadioMember[];
}

export interface RadioMember {
  id: string;
  channel_id: string;
  user_id: string;
  created_at: string;
}

export interface RadioMessage {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  duration_seconds: number;
  media_url: string | null;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  ownership_type: 'personal' | 'company' | 'rental';
  status: 'pending' | 'approved' | 'revision_requested' | 'rejected';
  admin_note: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'warned' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'message' | 'user';
  target_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  from_user_id: string;
  to_user_id: string;
  load_id: string | null;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export type AppScreen =
  | 'landing'
  | 'register'
  | 'login'
  | 'admin-login'
  | 'loads'
  | 'load-detail'
  | 'new-load'
  | 'chat'
  | 'dm-list'
  | 'dm-chat'
  | 'radio'
  | 'radio-channel'
  | 'games'
  | 'hokm-game'
  | 'manch-game'
  | 'profile'
  | 'profile-edit'
  | 'invoice'
  | 'invoice-create'
  | 'verification'
  | 'tickets'
  | 'ticket-detail'
  | 'notifications'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-user-detail'
  | 'admin-verification'
  | 'admin-tickets'
  | 'admin-reports'
  | 'admin-directed-load'
  | 'admin-settings'
  | 'manager-dashboard'
  | 'manager-admins'
  | 'manager-backup'
  | 'manager-logs'
  | 'manager-settings'
  | 'blacklist';