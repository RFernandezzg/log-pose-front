import { Injectable } from '@angular/core';
import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { AuthSessionService } from './auth-session.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private session: AuthSessionService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.session.token;
    if (token) {
      const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      return next.handle(cloned);
    }
    return next.handle(req);
  }
}
