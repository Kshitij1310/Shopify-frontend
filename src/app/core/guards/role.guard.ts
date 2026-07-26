import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRole = route.data['role'] as string;
  const uid = authService.getCurrentUid();

  if (!authService.isLoggedIn() || !uid) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: router.url },
    });
  }

  // Keep customer navigation snappy after login and avoid profile stream delays.
  if (expectedRole === 'customer') {
    return true;
  }

  let profile = await authService.getProfileByUid(uid);

  if (!profile) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    profile = await authService.getProfileByUid(uid);
  }

  if (!profile) {
    return router.createUrlTree(['/customer/home']);
  }

  if (expectedRole && profile.role !== expectedRole) {
    return router.createUrlTree([profile.role === 'partner' ? '/seller/dashboard' : '/customer/home']);
  }

  return true;
};
