export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthResponse extends AuthUser {
  token?: string;
  requiresTotp?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  totpCode?: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  email?: string;
  avatarUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UserProfileDto extends AuthUser {
  avatarUrl?: string;
  createdAt?: string;
  isTotpEnabled?: boolean;
}

export interface TotpSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface TotpEnableRequest {
  secret: string;
  code: number;
}