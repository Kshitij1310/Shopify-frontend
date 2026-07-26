import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SharedModule } from '../../../../../../shared/shared.module';
import { UpiApp } from '../../payment.models';

@Component({
  selector: 'app-upi-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, SharedModule],
  templateUrl: './upi-payment.component.html',
  styleUrl: './upi-payment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpiPaymentComponent {
  private readonly fb = inject(FormBuilder);

  readonly processing = input(false);
  readonly submitPayment = output<{ upiId: string; upiApp: UpiApp }>();

  readonly apps: UpiApp[] = ['Google Pay', 'PhonePe', 'Paytm'];
  selectedApp: UpiApp = 'Google Pay';

  readonly form = this.fb.nonNullable.group({
    upiId: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/)]],
  });

  selectApp(app: UpiApp): void {
    this.selectedApp = app;
  }

  onUpiInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim().toLowerCase().replace(/\s+/g, '');
    this.form.controls.upiId.setValue(value);
    input.value = value;
  }

  pay(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitPayment.emit({
      upiId: this.form.controls.upiId.value.trim(),
      upiApp: this.selectedApp,
    });
  }

  hasError(name: 'upiId', error: string): boolean {
    const control = this.form.controls[name];
    return control.touched && control.hasError(error);
  }
}