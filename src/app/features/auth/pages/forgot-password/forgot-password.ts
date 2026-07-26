import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UiService } from '../../../../shared/services/ui.service';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly ui = inject(UiService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.ui.setLoading(true);
    try {
      await this.authService.forgotPassword(this.form.getRawValue().email);
      this.ui.toast('Password reset email sent');
    } catch (error: any) {
      this.ui.toast(error?.message ?? 'Request failed');
    } finally {
      this.ui.setLoading(false);
    }
  }
}
