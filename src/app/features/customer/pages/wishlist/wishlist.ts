import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WishlistItem } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { ProductService } from '../../../../core/services/product.service';
import { UiService } from '../../../../shared/services/ui.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-wishlist',
  standalone: false,
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist implements OnInit, OnDestroy {
  items: WishlistItem[] = [];
  private subscription?: Subscription;
  private authSub?: Subscription;
  readonly defaultImageUrl = `${environment.apiBaseUrl.replace(/\/api\/?$/, '')}/assets/products/default-lucide.svg`;

  constructor(
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly productService: ProductService,
    private readonly ui: UiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get totalValue(): number {
    return this.items.reduce((sum, item) => sum + (item.product?.price ?? 0), 0);
  }

  get itemCount(): number {
    return this.items.length;
  }

  ngOnInit(): void {
    this.authSub = this.authService.authState$.subscribe((user) => {
      this.subscription?.unsubscribe();

      if (!user) {
        this.items = [];
        this.cdr.markForCheck();
        return;
      }

      this.subscription = this.cartService.watchWishlist(user.uid).subscribe({
        next: (items) => {
          this.items = items.map((item) => ({
            ...item,
            product: item.product
              ? {
                  ...item.product,
                  imageUrl: this.productService.resolveImageUrl(item.product),
                }
              : {
                  id: item.productId,
                  name: 'Unknown product',
                  price: 0,
                  quantity: 0,
                  category: '',
                  description: '',
                  imageUrl: this.defaultImageUrl,
                  sellerId: '',
                  createdAt: 0,
                  updatedAt: 0,
                },
          }));
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          const message = (error as { code?: string; message?: string } | null)?.message;
          console.error('Wishlist error:', message);
          this.items = [];
          this.cdr.markForCheck();
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.subscription?.unsubscribe();
  }

  async remove(item: WishlistItem): Promise<void> {
    if (!item.id) {
      return;
    }

    try {
      await this.cartService.removeFromWishlist(item.id);

      this.items = this.items.filter(
        (wishlistItem) => wishlistItem.id !== item.id
      );

      this.cdr.detectChanges();

      this.ui.toast('Removed from wishlist');
    } catch (error) {
      console.error(error);
      this.ui.toast('Failed to remove item');
    }
  }

  async moveToCart(item: WishlistItem): Promise<void> {
    const uid = await this.authService.getCurrentUidAsync();

    if (!uid || !item.id) {
      return;
    }

    try {
      await this.cartService.addToCart(uid, item.product);

      await this.cartService.removeFromWishlist(item.id);

      this.items = this.items.filter(
        (wishlistItem) => wishlistItem.id !== item.id
      );

      this.cdr.detectChanges();

      this.ui.toast('Moved to cart');
    } catch (error) {
      console.error(error);
      this.ui.toast('Failed to move item to cart');
    }
  }
}
