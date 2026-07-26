import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from '../../../../../../shared/shared.module';
import { PaymentMethod } from '../../payment.models';

interface PaymentMethodOption {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  chips: string[];
}

@Component({
  selector: 'app-payment-method-selector',
  standalone: true,
  imports: [CommonModule, MatButtonModule, SharedModule],
  templateUrl: './payment-method-selector.component.html',
  styleUrl: './payment-method-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodSelectorComponent {
  readonly selectedMethod = input<PaymentMethod>('upi');
  readonly methodSelected = output<PaymentMethod>();

  readonly options: PaymentMethodOption[] = [
    {
      id: 'upi',
      title: 'UPI',
      subtitle: 'Fast mobile checkout',
      icon: 'qr-code',
      accent: 'upi',
      chips: ['Google Pay', 'PhonePe', 'Paytm'],
    },
    {
      id: 'card',
      title: 'Card',
      subtitle: 'Credit or debit card',
      icon: 'credit-card',
      accent: 'card',
      chips: ['Visa', 'Mastercard'],
    },
    {
      id: 'wallet',
      title: 'Wallet',
      subtitle: 'Optional balance checkout',
      icon: 'wallet',
      accent: 'wallet',
      chips: ['Fast Pay', 'Low friction'],
    },
  ];

  select(method: PaymentMethod): void {
    this.methodSelected.emit(method);
  }
}