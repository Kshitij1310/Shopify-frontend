import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartItem } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { ProductService } from '../../../../core/services/product.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { UiService } from '../../../../shared/services/ui.service';

@Component({
  selector: 'app-cart',
  standalone: false,
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit, OnDestroy {
  readonly defaultImageUrl = `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}/assets/products/default-lucide.svg`;
  cartItems: CartItem[] = [];
  walletBalance = 0;
  expandWallet = false;

  private cartSub?: Subscription;
  private walletSub?: Subscription;
  private authSub?: Subscription;

private deferStateUpdate(update: () => void): void {
  update();           // run immediately
  this.cdr.markForCheck();  // tell Angular to re-check
}

  constructor(
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly productService: ProductService,
    private readonly walletService: WalletService,
    private readonly ui: UiService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get total(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
  }

  get hasOutOfStockItems(): boolean {
    return this.cartItems.some((item) => Number(item.product.quantity ?? 0) <= 0);
  }

  get hasExcessQuantityItems(): boolean {
    return this.cartItems.some((item) => Number(item.quantity ?? 0) > Number(item.product.quantity ?? 0));
  }

  get canCheckout(): boolean {
    return !this.hasOutOfStockItems && !this.hasExcessQuantityItems;
  }

  ngOnInit(): void {
    this.authSub = this.authService.authState$.subscribe((user) => {
      this.cartSub?.unsubscribe();
      this.walletSub?.unsubscribe();

      if (!user) {
        this.deferStateUpdate(() => {
          this.cartItems = [];
          this.walletBalance = 0;
        });
        return;
      }

      this.cartSub = this.cartService.watchCart(user.uid).subscribe({
        next: (items) => {
          this.deferStateUpdate(() => {
            this.cartItems = items.map((item) => ({
              ...item,
              product: {
                ...item.product,
                imageUrl: this.productService.resolveImageUrl(item.product),
              },
            }));
          });
        },
        error: (error: unknown) => {
          const message = (error as { code?: string; message?: string } | null)?.message;
          this.ui.toast(message ? `Cart sync failed: ${message}` : 'Cart sync failed. Please reload.');
        },
      });
      this.walletSub = this.walletService.watchBalance(user.uid).subscribe((balance) => {
        this.deferStateUpdate(() => {
          this.walletBalance = balance;
        });
      });
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.cartSub?.unsubscribe();
    this.walletSub?.unsubscribe();
  }

  async updateQty(item: CartItem, delta: number): Promise<void> {
    if (!item.id) {
      return;
    }
    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    if (newQty > Number(item.product.quantity ?? 0)) {
      this.ui.toast(`Only ${item.product.quantity} item(s) available`);
      return;
    }

    try {
      await this.cartService.updateCartQuantity(item.id, newQty);
    } catch (error: any) {
      this.ui.toast(error?.message ?? 'Could not update quantity');
    }
  }

  onQtyChange(item: CartItem, event: Event): void {
    const target = event.target as HTMLInputElement;
    const newQty = parseInt(target.value, 10);
    if (isNaN(newQty) || newQty < 1) {
      target.value = item.quantity.toString();
      return;
    }
    if (newQty > Number(item.product.quantity ?? 0)) {
      target.value = item.quantity.toString();
      this.ui.toast(`Only ${item.product.quantity} item(s) available`);
      return;
    }

    if (item.id) {
      this.cartService.updateCartQuantity(item.id, newQty).catch((error: any) => {
        this.ui.toast(error?.message ?? 'Could not update quantity');
      });
    }
  }

  async remove(item: CartItem): Promise<void> {
    if (!item.id) {
      return;
    }

    try {
      await this.cartService.removeFromCart(item.id);

      this.cartItems = this.cartItems.filter(
        cartItem => cartItem.id !== item.id
      );

      this.cdr.detectChanges();

      this.ui.toast('Item removed');
    } catch (error) {
      console.error(error);
      this.ui.toast('Failed to remove item');
    }
  }

  async topUp(amount: number): Promise<void> {
    const uid = this.authService.getCurrentUid();
    if (!uid) {
      return;
    }
    await this.walletService.addMoney(uid, amount);
    this.ui.toast('Wallet topped up');
  }

  goToCheckout(): void {
    if (!this.canCheckout) {
      this.ui.toast('Some items are out of stock. Please update your cart first.');
      return;
    }

    this.router.navigate(['/customer/checkout']);
  }

  continueShopping(): void {
    this.router.navigate(['/customer/products']);
  }
}
