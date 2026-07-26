import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Order } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-orders',
  standalone: false,
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnInit, OnDestroy {
  private readonly currencyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  orders: Order[] = [];
  private authSub?: Subscription;
  private ordersSub?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly orderService: OrderService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  formatCurrency(value: number): string {
    return this.currencyFormatter.format(Math.round(value));
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getOrderTotalAmount(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }

  getTotalUnits(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  ngOnInit(): void {
    this.authSub = this.authService.authState$.subscribe((user) => {
      Promise.resolve().then(() => {
        const uid = user?.uid ?? '';

        if (!uid) {
          this.orders = [];
          this.ordersSub?.unsubscribe();
          this.ordersSub = undefined;
          this.cdr.markForCheck();
          return;
        }

        if (this.ordersSub) {
          return;
        }

        this.ordersSub = this.orderService.watchSellerOrders(uid).subscribe((orders) => {
          Promise.resolve().then(() => {
            this.orders = orders;
            this.cdr.markForCheck();
          });
        });
      });
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.ordersSub?.unsubscribe();
  }
}
