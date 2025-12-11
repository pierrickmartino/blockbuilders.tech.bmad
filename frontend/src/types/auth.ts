export interface User {
  id: string;
  email: string;
  default_fee_percent: number | null;
  default_slippage_percent: number | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserUpdateRequest {
  default_fee_percent?: number | null;
  default_slippage_percent?: number | null;
}
