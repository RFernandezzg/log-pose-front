import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(AuthSessionService);
  if (session.isAuthenticated()) return true;
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
