import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SharedModule } from '../../../../../../shared/shared.module';
import { PaymentSummary } from '../../payment.models';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, SharedModule],
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSummaryComponent {
  private readonly fb = inject(FormBuilder);

  readonly summary = input.required<PaymentSummary>();
  readonly appliedCoupon = input<string | null>(null);
  readonly couponApplied = output<string>();

  readonly couponForm = this.fb.nonNullable.group({
    couponCode: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly highlights = ['Secure Payment', 'Mock Razorpay/Stripe', 'SSL verified'];

  applyCoupon(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }

    this.couponApplied.emit(this.couponForm.controls.couponCode.value.trim().toUpperCase());
  }

  hasError(error: string): boolean {
    const control = this.couponForm.controls.couponCode;
    return control.touched && control.hasError(error);
  }
}