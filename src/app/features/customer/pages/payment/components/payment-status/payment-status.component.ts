import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SharedModule } from '../../../../../../shared/shared.module';
import { PaymentStatus } from '../../payment.models';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule, SharedModule],
  templateUrl: './payment-status.component.html',
  styleUrl: './payment-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentStatusComponent {
  readonly status = input<PaymentStatus>('idle');
  readonly title = input('');
  readonly message = input('');
  readonly referenceId = input('');
  readonly retry = output<void>();
  readonly continueToOrders = output<void>();
}