import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly SESSION_KEY = 'auth_session';
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private userSubject = new BehaviorSubject<AuthUser | null>(null);

  token$ = this.tokenSubject.asObservable();
  user$ = this.userSubject.asObservable();

  constructor() {
    this.hydrate();
  }

  hydrate() {
    const rawSession = localStorage.getItem(this.SESSION_KEY);
    if (!rawSession) {
      this.tokenSubject.next(null);
      this.userSubject.next(null);
      return;
    }

    try {
      const session = JSON.parse(rawSession) as { token: string; user: AuthUser };
      this.tokenSubject.next(session.token ?? null);
      this.userSubject.next(session.user ?? null);
    } catch {
      this.clear();
    }
  }

  setSession(token: string, user: AuthUser) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({ token, user }));
    this.tokenSubject.next(token);
    this.userSubject.next(user);
  }

  updateUser(user: AuthUser) {
    const token = this.token;
    if (token) {
      this.setSession(token, user);
    }
  }

  clear() {
    localStorage.removeItem(this.SESSION_KEY);
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get user(): AuthUser | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }
}
