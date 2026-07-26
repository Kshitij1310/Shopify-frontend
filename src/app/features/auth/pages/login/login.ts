import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UiService } from '../../../../shared/services/ui.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.ui.setLoading(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.authService.login(email.trim(), password);

      const uid = await this.authService.getCurrentUidAsync(8000);
      let role: 'customer' | 'partner' = 'customer';

      if (uid) {
        let profile = await this.authService.getProfileByUid(uid);
        if (!profile) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          profile = await this.authService.getProfileByUid(uid);
        }
        if (profile?.role === 'partner') {
          role = 'partner';
        }
      }

      const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'] as string | undefined;
      if (returnUrl) {
        await this.router.navigateByUrl(returnUrl);
      } else {
        await this.router.navigate([role === 'partner' ? '/seller/dashboard' : '/customer/home']);
      }

      this.ui.toast('Login successful');

    } catch (error: any) {
      const message = this.getErrorMessage(error);
      this.ui.toast(message);
    } finally {
      this.ui.setLoading(false);
    }
  }

  private getErrorMessage(error: any): string {
    const backendMessage = String(error?.error?.message ?? error?.message ?? '').trim();
    if (backendMessage) {
      const normalized = backendMessage.toLowerCase();
      if (normalized.includes('invalid credentials')) {
        return 'Wrong username or password';
      }
      if (normalized.includes('validation')) {
        return backendMessage;
      }
      return backendMessage;
    }

    switch (error?.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Wrong username or password';

      case 'auth/network-request-failed':
        return 'Connection issue. Please check your internet';

      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later';

      case 'auth/invalid-email':
        return 'Invalid email format';

      default:
        return 'Something went wrong. Please try again';
    }
  }
}
