export interface Badge {
  key: string;
  label: string;
}

export interface Contributions {
  published_strategies: number;
  completed_backtests: number;
}

export interface PublishedStrategy {
  id: string;
  name: string;
}

export interface PublicProfile {
  handle: string;
  display_name: string | null;
  bio: string | null;
  follower_count: number;
  published_strategies: PublishedStrategy[] | null;
  contributions: Contributions | null;
  badges: Badge[] | null;
}

export interface ProfileSettings {
  is_public: boolean;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  show_strategies: boolean;
  show_contributions: boolean;
  show_badges: boolean;
  follower_count: number;
}

export interface ProfileUpdateRequest {
  is_public?: boolean;
  handle?: string | null;
  display_name?: string | null;
  bio?: string | null;
  show_strategies?: boolean;
  show_contributions?: boolean;
  show_badges?: boolean;
}
