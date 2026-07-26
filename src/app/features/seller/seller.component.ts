import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-seller',
  standalone: false,
  templateUrl: './seller.component.html',
  styleUrl: './seller.component.scss',
})
export class Seller {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly profile$ = this.authService.profile$;
  readonly sellerName$ = this.profile$.pipe(
    map((profile) => {
      if (profile?.displayName?.trim()) {
        return profile.displayName.trim();
      }
      if (profile?.email?.trim()) {
        return profile.email.split('@')[0];
      }
      return 'Seller';
    }),
  );

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/auth/login']);
  }
}
