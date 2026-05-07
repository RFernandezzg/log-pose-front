import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';

export const guestGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const session = inject(AuthSessionService);

  if (!session.isAuthenticated()) {
    return true;
  }

  // If there's a returnUrl, let the user through (they need to complete a flow)
  const returnUrl = route.queryParams['returnUrl'];
  if (returnUrl) {
    return true;
  }

  router.navigate(['/decks']);
  return false;
};