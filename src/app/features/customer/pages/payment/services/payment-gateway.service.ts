import { Injectable } from '@angular/core';
import { Observable, map, timer } from 'rxjs';
import { PaymentMethod, PaymentRequest, PaymentResult } from '../payment.models';

@Injectable({
  providedIn: 'root',
})
export class PaymentGatewayService {
  process(request: PaymentRequest): Observable<PaymentResult> {
    return timer(2600).pipe(map(() => this.createResult(request)));
  }

  private createResult(request: PaymentRequest): PaymentResult {
    const successRateByMethod: Record<PaymentMethod, number> = {
      upi: 0.9,
      card: 0.88,
      wallet: 0.96,
    };

    if (request.method === 'wallet' && typeof request.walletBalance === 'number' && request.walletBalance < request.amount) {
      return {
        success: false,
        method: request.method,
        referenceId: this.createReferenceId(request.method),
        message: 'Insufficient wallet balance. Add funds or choose another method.',
      };
    }

    const approved = Math.random() < successRateByMethod[request.method];

    return {
      success: approved,
      method: request.method,
      referenceId: this.createReferenceId(request.method),
      message: approved
        ? 'Payment authorized and captured successfully.'
        : 'Gateway could not authorize this transaction. Try another method or retry.',
    };
  }

  private createReferenceId(method: PaymentMethod): string {
    const prefix = method.toUpperCase();
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
}