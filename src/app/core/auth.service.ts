import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { AuthResponse, LoginRequest, RegisterRequest, AuthUser, UpdateProfileRequest, UserProfileDto, TotpSetupResponse, TotpEnableRequest } from './auth.models';
import { AuthSessionService } from './auth-session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private api: ApiClientService,
    private session: AuthSessionService
  ) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', request).pipe(
      tap((response) => this.storeResponse(response))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', request).pipe(
      tap((response) => this.storeResponse(response))
    );
  }

  me(): Observable<AuthResponse> {
    return this.api.get<AuthResponse>('/auth/me');
  }

  getUserProfile(username: string): Observable<UserProfileDto> {
    return this.api.get<UserProfileDto>(`/users/${username}`);
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserProfileDto> {
    return this.api.put<UserProfileDto>('/users/me', request);
  }

  uploadAvatar(file: File): Observable<UserProfileDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<UserProfileDto>('/users/avatar', formData);
  }

  setupTotp(): Observable<TotpSetupResponse> {
    return this.api.get<TotpSetupResponse>('/users/totp/setup');
  }

  enableTotp(request: TotpEnableRequest): Observable<void> {
    return this.api.post<void>('/users/totp/enable', request);
  }

  disableTotp(): Observable<void> {
    return this.api.post<void>('/users/totp/disable', {});
  }

  logout(): void {
    this.session.clear();
  }

  private storeResponse(response: AuthResponse): void {
    if (!response.token) {
      return;
    }

    const user: AuthUser = {
      id: response.id,
      username: response.username,
      email: response.email,
      avatarUrl: response.avatarUrl
    };

    this.session.setSession(response.token, user);
  }
}