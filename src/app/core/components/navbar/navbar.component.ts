import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfile } from '../../models/app.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class Navbar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly authState$ = this.authService.authState$;
  readonly profile$ = this.authService.profile$;

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/auth/login']);
  }

  isPartner(profile: UserProfile | null): boolean {
    return profile?.role === 'partner';
  }
}
