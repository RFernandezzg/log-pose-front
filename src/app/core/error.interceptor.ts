import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthSessionService } from './auth-session.service';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private session: AuthSessionService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.session.clear();
          this.router.navigate(['/auth/login']);
        }

        if ([403, 404, 502].includes(err.status)) {
          console.error(`HTTP ${err.status} on ${req.method} ${req.url}`, err.error ?? err.message);
        }

        return throwError(() => err);
      })
    );
  }
}
