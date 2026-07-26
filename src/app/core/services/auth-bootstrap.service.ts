import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthBootstrapService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Run at application startup to ensure a persisted session exists.
   * Token expiry is handled by the HTTP interceptor.
   */
  async init(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.auth.clearSession();
      // ensure we end up on the login page when there is no valid session
      try {
        await this.router.navigate(['/auth/login'], { replaceUrl: true });
      } catch {
        // ignore navigation failures during bootstrap
      }
      return;
    }
  }
}