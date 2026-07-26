import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

const ensureAuthenticated = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn()) {
    return true;
  }

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: router.url },
    });
  }

  return true;
};

export const authGuard: CanActivateFn = async () => ensureAuthenticated();

export const authMatchGuard: CanMatchFn = async () => ensureAuthenticated();

export const guestGuard: CanMatchFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return router.createUrlTree(['/customer/home']);
  }

  return true;
};