import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { OrderService } from '../../../../core/services/order.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { UiService } from '../../../../shared/services/ui.service';
import { PaymentGatewayService } from './services/payment-gateway.service';
import {
  CouponDiscount,
  PaymentDraft,
  PaymentMethod,
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  PaymentSummary,
  UpiApp,
} from './payment.models';
import { CardPaymentPayload } from './components/card-payment/card-payment.component';

@Component({
  selector: 'app-payment',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class Payment implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly walletService = inject(WalletService);
  private readonly orderService = inject(OrderService);
  private readonly paymentGateway = inject(PaymentGatewayService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly orderDraft = history.state?.['orderDraft'] as
    | PaymentDraft
    | undefined;

  selectedMethod: PaymentMethod = 'upi';
  paymentStatus: PaymentStatus = 'idle';
  paymentTitle = '';
  paymentMessage = '';
  paymentReferenceId = '';
  walletBalance = 0;
  appliedCoupon: CouponDiscount | null = null;

  private currentUid = '';
  private authSub?: Subscription;
  private walletSub?: Subscription;
  private paymentSub?: Subscription;

  get subtotal(): number {
    return Number(this.orderDraft?.amount ?? 0);
  }

  get tax(): number {
    return this.subtotal * 0.1;
  }

  get discount(): number {
    return this.appliedCoupon?.amount ?? 0;
  }

  get grandTotal(): number {
    return Math.max(0, this.subtotal + this.tax - this.discount);
  }

  get summary(): PaymentSummary {
    return {
      subtotal: this.subtotal,
      tax: this.tax,
      discount: this.discount,
      total: this.grandTotal,
    };
  }

  get statusMessage(): string {
    return this.paymentStatus === 'idle' ? 'Choose a payment method to continue.' : this.paymentMessage;
  }

  get methodLabel(): string {
    return this.selectedMethod === 'upi' ? 'UPI' : this.selectedMethod === 'card' ? 'Card' : 'Wallet';
  }

  get canUseWallet(): boolean {
    return this.walletBalance >= this.grandTotal;
  }

  get isProcessing(): boolean {
    return this.paymentStatus === 'processing';
  }

  ngOnInit(): void {
    if (!this.orderDraft) {
      void this.router.navigate(['/customer/cart']);
      return;
    }

    this.authSub = this.authService.authState$.subscribe((user) => {
      this.currentUid = user?.uid ?? '';
      this.walletSub?.unsubscribe();

      if (!this.currentUid) {
        return;
      }

      this.walletSub = this.walletService.watchBalance(this.currentUid).subscribe((balance) => {
        this.walletBalance = balance;
        this.cdr.markForCheck();
      });
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.walletSub?.unsubscribe();
    this.paymentSub?.unsubscribe();
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod = method;

    if (this.paymentStatus !== 'processing') {
      this.paymentStatus = 'idle';
      this.paymentTitle = '';
      this.paymentMessage = '';
      this.paymentReferenceId = '';
    }

    this.cdr.markForCheck();
  }

  applyCoupon(code: string): void {
    const normalized = code.trim().toUpperCase();
    const discount = this.calculateCouponDiscount(normalized);

    if (!discount) {
      this.appliedCoupon = null;
      this.ui.toast('Coupon not found');
      this.cdr.markForCheck();
      return;
    }

    this.appliedCoupon = discount;
    this.ui.toast(`${discount.code} applied`);
    this.cdr.markForCheck();
  }

  submitUpiPayment(payload: { upiId: string; upiApp: UpiApp }): void {
    this.startPayment({
      method: 'upi',
      upiId: payload.upiId,
      upiApp: payload.upiApp,
    });
  }

  submitCardPayment(payload: CardPaymentPayload): void {
    this.startPayment({
      method: 'card',
      cardBrand: payload.cardBrand,
      cardholderName: payload.cardholderName,
      cardNumberMasked: payload.cardNumber,
    });
  }

  submitWalletPayment(): void {
    this.startPayment({ method: 'wallet', walletBalance: this.walletBalance });
  }

  retryPayment(): void {
    this.paymentStatus = 'idle';
    this.paymentTitle = '';
    this.paymentMessage = '';
    this.paymentReferenceId = '';
    this.cdr.markForCheck();
  }

  async goToOrders(): Promise<void> {
    await this.router.navigate(['/customer/orders']);
  }

  private startPayment(extra: Partial<PaymentRequest>): void {
    if (!this.orderDraft || !this.currentUid) {
      this.ui.toast('No order found. Start checkout again.');
      void this.router.navigate(['/customer/cart']);
      return;
    }

    if (this.paymentStatus === 'processing') {
      return;
    }

    this.paymentStatus = 'processing';
    this.paymentTitle = '';
    this.paymentMessage = '';
    this.paymentReferenceId = '';
    this.cdr.markForCheck();

    const request: PaymentRequest = {
      uid: this.currentUid,
      amount: this.grandTotal,
      method: extra.method ?? this.selectedMethod,
      orderDraft: this.orderDraft,
      couponCode: this.appliedCoupon?.code,
      ...extra,
    };

    this.paymentSub?.unsubscribe();
    this.paymentSub = this.paymentGateway.process(request).subscribe({
      next: async (result) => {
        await this.finalizePayment(result, request);
      },
      error: async (error) => {
        this.paymentStatus = 'failed';
        this.paymentTitle = 'Payment Failed';
        this.paymentMessage = error?.message ?? 'Unexpected payment error';
        this.paymentReferenceId = '';
        this.cdr.markForCheck();
      },
    });
  }

  private async finalizePayment(result: PaymentResult, request: PaymentRequest): Promise<void> {
    const paymentStatus: PaymentStatus = result.success ? 'success' : 'failed';

    try {
      await this.orderService.placeOrder({
        ...this.orderDraft!,
        amount: this.grandTotal,
        status: result.success ? 'placed' : 'failed',
        paymentStatus: result.success ? 'success' : 'failed',
        paymentMethod: request.method,
        couponCode: this.appliedCoupon?.code,
        paymentReferenceId: result.referenceId,
      });

      if (result.success) {
        if (request.method === 'wallet') {
          await this.walletService.deductMoney(this.currentUid, this.grandTotal);
        }

        await this.cartService.clearCart(this.currentUid);
      }

      this.paymentStatus = paymentStatus;
      this.paymentTitle = result.success ? 'Payment Successful' : 'Payment Failed';
      this.paymentMessage = result.message;
      this.paymentReferenceId = result.referenceId;
      this.ui.toast(result.success ? 'Payment successful' : 'Payment failed');
    } catch (error: any) {
      this.paymentStatus = 'failed';
      this.paymentTitle = 'Payment Failed';
      this.paymentMessage = error?.message ?? 'Unable to complete checkout';
      this.paymentReferenceId = result.referenceId;
      this.ui.toast(error?.message ?? 'Payment failed');
    } finally {
      this.cdr.markForCheck();
    }
  }

  private calculateCouponDiscount(code: string): CouponDiscount | null {
    const discountMap: Record<string, (subtotal: number) => CouponDiscount> = {
      SAVE10: (subtotal) => ({ code: 'SAVE10', label: '10% off', amount: subtotal * 0.1 }),
      WELCOME15: (subtotal) => ({ code: 'WELCOME15', label: '15% off, capped at Rs. 250', amount: Math.min(subtotal * 0.15, 250) }),
      FLAT100: (subtotal) => ({ code: 'FLAT100', label: 'Flat Rs. 100 off', amount: subtotal >= 999 ? 100 : 0 }),
    };

    const factory = discountMap[code];
    if (!factory) {
      return null;
    }

    const discount = factory(this.subtotal);
    return discount.amount > 0 ? discount : null;
  }
}