import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Order } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderService } from '../../../../core/services/order.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { UiService } from '../../../../shared/services/ui.service';

@Component({
  selector: 'app-order-history',
  standalone: false,
  templateUrl: './order-history.html',
  styleUrl: './order-history.scss',
})
export class OrderHistory implements OnInit, OnDestroy {
  orders: Order[] = [];
  private currentUid = '';
  private subscription?: Subscription;
  private authSub?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly orderService: OrderService,
    private readonly walletService: WalletService,
    private readonly ui: UiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.authSub = this.authService.authState$.subscribe((user) => {
      this.subscription?.unsubscribe();
      this.currentUid = user?.uid ?? '';

      if (!user) {
        this.orders = [];
        this.cdr.markForCheck();
        return;
      }

      this.subscription = this.orderService
        .watchCustomerOrders(user.uid)
        .subscribe((orders) => {
          this.orders = orders;
          this.cdr.markForCheck();
        });
    });
  }

  get totalSpent(): number {
    return this.orders.reduce((sum, order) => sum + Number(order.amount ?? 0), 0);
  }

  get successfulOrdersCount(): number {
    return this.orders.filter((order) => order.paymentStatus === 'success').length;
  }

  get successRate(): number {
    if (!this.orders.length) {
      return 0;
    }
    return (this.successfulOrdersCount / this.orders.length) * 100;
  }

  getOrderItemCount(order: Order): number {
    return order.items.reduce((count, item) => count + Number(item.quantity ?? 0), 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN').format(Math.round(Number(amount ?? 0)));
  }

  formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  getOrderStatusClass(status: Order['status']): string {
    if (status === 'placed') {
      return 'badge placed';
    }

    if (status === 'canceled') {
      return 'badge canceled';
    }

    return 'badge failed';
  }

  getPaymentStatusClass(status: Order['paymentStatus']): string {
    if (status === 'success') {
      return 'badge success';
    }
    if (status === 'pending') {
      return 'badge pending';
    }
    return 'badge failed';
  }

  canCancelOrder(order: Order): boolean {
    return order.status === 'placed';
  }

  async cancelOrder(order: Order): Promise<void> {
    if (!order.id || !this.canCancelOrder(order)) {
      return;
    }

    const shouldCancel = window.confirm(`Cancel order #${order.id}?`);
    if (!shouldCancel) {
      return;
    }

    try {
      await this.orderService.cancelOrder(order.id);

      if (order.paymentMethod === 'wallet' && this.currentUid) {
        await this.walletService.addMoney(this.currentUid, Number(order.amount ?? 0));
      }

      this.ui.toast('Order canceled');
    } catch (error: any) {
      this.ui.toast(error?.message ?? 'Unable to cancel order');
    }
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.subscription?.unsubscribe();
  }
}