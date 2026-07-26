import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SharedModule } from '../../../../../../shared/shared.module';
import { CardBrand } from '../../payment.models';

export interface CardPaymentPayload {
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
  cardBrand: CardBrand;
}

@Component({
  selector: 'app-card-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, SharedModule],
  templateUrl: './card-payment.component.html',
  styleUrl: './card-payment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardPaymentComponent {
  private readonly fb = inject(FormBuilder);

  readonly processing = input(false);
  readonly submitPayment = output<CardPaymentPayload>();

  readonly form = this.fb.nonNullable.group({
    cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4} \d{4} \d{4} \d{4}$/)]],
    expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
    cardholderName: ['', [Validators.required, Validators.minLength(3)]],
  });

  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    this.form.controls.cardNumber.setValue(formatted);
    input.value = formatted;
  }

  onExpiryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    this.form.controls.expiry.setValue(formatted);
    input.value = formatted;
  }

  onCvvInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 3);
    this.form.controls.cvv.setValue(digits);
    input.value = digits;
  }

  pay(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    this.submitPayment.emit({
      cardNumber: values.cardNumber,
      expiry: values.expiry,
      cvv: values.cvv,
      cardholderName: values.cardholderName,
      cardBrand: this.cardBrand,
    });
  }

  get cardBrand(): CardBrand {
    const digits = this.form.controls.cardNumber.value.replace(/\D/g, '');
    if (digits.startsWith('4')) {
      return 'Visa';
    }

    if (/^(5[1-5]|2[2-7])/.test(digits)) {
      return 'Mastercard';
    }

    return 'Card';
  }

  get maskedCardNumber(): string {
    const digits = this.form.controls.cardNumber.value.replace(/\D/g, '');
    if (digits.length < 4) {
      return '•••• •••• •••• ••••';
    }

    return digits
      .padEnd(16, '•')
      .replace(/(.{4})/g, '$1 ')
      .trim();
  }

  hasError(name: 'cardNumber' | 'expiry' | 'cvv' | 'cardholderName', error: string): boolean {
    const control = this.form.controls[name];
    return control.touched && control.hasError(error);
  }
}