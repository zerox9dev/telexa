export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed'

export interface Channel {
  id: string
  user_id: string
  bot_token: string
  chat_id: string
  title: string
  username: string | null
  member_count: number | null
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  channel_id: string
  text: string
  media_url: string | null
  status: PostStatus
  scheduled_at: string | null
  published_at: string | null
  views: number | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  name: string | null
  plan: 'free' | 'pro' | 'team'
  post_count: number
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      channels: {
        Row: Channel
        Insert: Omit<Channel, 'id' | 'created_at'>
        Update: Partial<Omit<Channel, 'id' | 'created_at'>>
      }
      posts: {
        Row: Post
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Post, 'id' | 'created_at'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
    }
  }
}
