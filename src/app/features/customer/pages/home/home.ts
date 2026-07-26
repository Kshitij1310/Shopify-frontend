import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, combineLatest, forkJoin, map, of, shareReplay, switchMap, take } from 'rxjs';
import { Order, Product, UserProfile, WishlistItem } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { UiService } from '../../../../shared/services/ui.service';
import { CustomerSearchService } from '../../services/customer-search.service';
import { environment } from '../../../../../environments/environment';

interface DashboardOrderCard {
  id: string;
  title: string;
  subtitle: string;
  createdAt: number;
  amount: number;
  itemCount: number;
  statusLabel: string;
  statusClass: string;
}

interface DashboardWishlistCard {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
}

interface DashboardProductCard {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  rating: string;
  reviewCount: number;
}

interface DashboardViewModel {
  displayName: string;
  initial: string;
  avatarUrl: string;
  walletBalance: number;
  totalOrders: number;
  completedOrders: number;
  wishlistCount: number;
  cartCount: number;
  availableCoupons: number;
  recentOrders: DashboardOrderCard[];
  wishlistItems: DashboardWishlistCard[];
  recommendedProducts: DashboardProductCard[];
}

interface DashboardLoadData {
  user: { uid: string; displayName?: string; email?: string } | null;
  profile: UserProfile | null;
  walletBalance: number;
  orders: Order[];
  cartItems: unknown[];
  wishlistItems: WishlistItem[];
  products: Product[];
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePageComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly customerSearchService = inject(CustomerSearchService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly walletService = inject(WalletService);
  private readonly authService = inject(AuthService);
  private readonly ui = inject(UiService);

  readonly chips = ['All', 'Electronics', 'Fashion', 'Home', 'Best Price', 'Popular'];
  activeChip = 'All';
  readonly defaultProductImageUrl = '/assets/products/default-lucide.svg';

  private products$!: Observable<Product[]>;
  dashboard$!: Observable<DashboardViewModel>;
  featuredProducts$!: Observable<Product[]>;

  ngOnInit(): void {
    this.products$ = this.productService.watchProducts().pipe(shareReplay(1));

    const load$ = this.authService.authState$.pipe(
      take(1),
      switchMap((user) => {
        if (!user) {
          return of<DashboardLoadData>({
            user: null,
            profile: null,
            walletBalance: 0,
            orders: [],
            cartItems: [],
            wishlistItems: [],
            products: [],
          });
        }

        return forkJoin({
          user: of(user),
          profile: this.authService.profile$.pipe(take(1), catchError(() => of(null))),
          walletBalance: this.walletService.watchBalance(user.uid).pipe(take(1), catchError(() => of(0))),
          orders: this.orderService.watchCustomerOrders(user.uid).pipe(take(1), catchError(() => of([]))),
          cartItems: this.cartService.watchCart(user.uid).pipe(take(1), catchError(() => of([]))),
          wishlistItems: this.cartService.watchWishlist(user.uid).pipe(take(1), catchError(() => of([]))),
          products: this.products$.pipe(take(1), catchError(() => of([]))),
        });
      }),
      shareReplay(1),
    );

    this.dashboard$ = combineLatest([
      load$,
      this.customerSearchService.query$,
      this.customerSearchService.category$,
      this.customerSearchService.sort$,
    ]).pipe(
      map(([load, query, category, sort]) => {
        if (!load.user) {
          return this.buildEmptyDashboard();
        }

        const filteredProducts = this.productService.filterAndSort(load.products, category, query, sort);
        const displayName = this.buildDisplayName(load.profile, load.user.displayName ?? load.user.email ?? null);

        return {
          displayName,
          initial: this.buildInitial(displayName),
          avatarUrl: this.normalizePhotoUrl(load.profile?.photoURL),
          walletBalance: load.walletBalance,
          totalOrders: load.orders.length,
          completedOrders: load.orders.filter((order) => order.status === 'placed' && order.paymentStatus === 'success').length,
          wishlistCount: load.wishlistItems.length,
          cartCount: load.cartItems.length,
          availableCoupons: 3,
          recentOrders: load.orders.slice(0, 4).map((order) => this.mapOrder(order)),
          wishlistItems: load.wishlistItems.slice(0, 5).map((item) => this.mapWishlistItem(item, load.products)),
          recommendedProducts: filteredProducts.slice(0, 6).map((product, index) => this.mapProduct(product, index)),
        } satisfies DashboardViewModel;
      }),
    );

    this.featuredProducts$ = combineLatest([
      this.products$,
      this.customerSearchService.query$,
      this.customerSearchService.category$,
      this.customerSearchService.sort$,
    ]).pipe(
      map(([items, query, category, sort]) => {
        return this.productService.filterAndSort(items, category, query, sort);
      }),
    );
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = this.defaultProductImageUrl;
  }

  selectChip(chip: string): void {
    this.activeChip = chip;

    if (chip === 'Best Price') {
      this.customerSearchService.setCategory('All');
      this.customerSearchService.setSort('priceAsc');
      return;
    }

    if (chip === 'Popular') {
      this.customerSearchService.setCategory('All');
      this.customerSearchService.setSort('priceDesc');
      return;
    }

    this.customerSearchService.setCategory(chip);
    this.customerSearchService.setSort('latest');
  }

  async addToCart(product: Product): Promise<void> {
    const uid = await this.authService.getCurrentUidAsync();
    if (!uid) {
      this.ui.toast('Please login first');
      return;
    }

    try {
      await this.cartService.addToCart(uid, product, 1);
      this.ui.toast('Added to cart');
    } catch (error: any) {
      this.ui.toast(error?.message ?? 'Could not add to cart');
    }
  }

  async addToWishlist(product: Product): Promise<void> {
    const uid = await this.authService.getCurrentUidAsync();
    if (!uid) {
      this.ui.toast('Please login first');
      return;
    }

    try {
      await this.cartService.addToWishlist(uid, product);
      this.ui.toast('Added to wishlist');
    } catch (error: any) {
      this.ui.toast(error?.message ?? 'Could not add to wishlist');
    }
  }

  async addRecommendedToCart(product: DashboardProductCard): Promise<void> {
    await this.addToCart(this.toProduct(product));
  }

  async addRecommendedToWishlist(product: DashboardProductCard): Promise<void> {
    await this.addToWishlist(this.toProduct(product));
  }

  openProductDetail(productId: string | null | undefined): void {
    if (!productId) {
      return;
    }

    void this.router.navigate(['/customer/products', productId]);
  }
  private buildEmptyDashboard(): DashboardViewModel {
    const fallbackName = 'Customer';

    return {
      displayName: fallbackName,
      initial: fallbackName.slice(0, 2).toUpperCase(),
      avatarUrl: '/assets/default-lucide.svg',
      walletBalance: 0,
      totalOrders: 0,
      completedOrders: 0,
      wishlistCount: 0,
      cartCount: 0,
      availableCoupons: 0,
      recentOrders: [],
      wishlistItems: [],
      recommendedProducts: [],
    };
  }

  private mapOrder(order: Order): DashboardOrderCard {
    const itemCount = (order.items || []).reduce((s, it) => s + Number(it.quantity ?? 0), 0);
    const title = order.items?.[0]?.product?.name ?? `Order ${order.id ?? ''}`;
    const subtitle = `${itemCount} item${itemCount === 1 ? '' : 's'} • ${new Date(order.createdAt).toLocaleDateString()}`;

    return {
      id: order.id ?? String(order.createdAt),
      title,
      subtitle,
      createdAt: order.createdAt,
      amount: order.amount ?? 0,
      itemCount,
      statusLabel: order.status ?? 'Delivered',
      statusClass: order.status === 'canceled' ? 'status-canceled' : 'status-success',
    };
  }

  private mapWishlistItem(item: WishlistItem, products: Product[]): DashboardWishlistCard {
    const productFromList = products.find((p) => p.id === item.productId);
    const source = productFromList ?? item.product;
    return {
      id: item.id ?? item.productId,
      name: source?.name ?? 'Product',
      category: source?.category ?? '',
      price: source?.price ?? 0,
      imageUrl: this.productService.resolveImageUrl(source ?? item.product),
    };
  }

  private mapProduct(product: Product, index: number): DashboardProductCard {
    return {
      id: product.id ?? `${product.name}-${product.createdAt}`,
      name: product.name,
      category: product.category,
      price: product.price,
      imageUrl: this.productService.resolveImageUrl(product),
      rating: '4.5',
      reviewCount: 10,
    };
  }

  private toProduct(product: DashboardProductCard): Product {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      category: product.category,
      description: '',
      imageUrl: product.imageUrl,
      sellerId: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private normalizePhotoUrl(url: string | undefined): string {
    const v = (url ?? '').trim();
    if (!v) return '/assets/default-lucide.svg';
    if (v.startsWith('data:') || v.startsWith('http')) return v;
    const normalized = v.replaceAll('\\', '/').replace(/^\.?\//, '').replace(/^src\//, '');
    return normalized.startsWith('assets/') ? `/${normalized}` : '/assets/default-lucide.svg';
  }

  private buildDisplayName(profile: UserProfile | null, authName: string | null): string {
    if (profile?.displayName?.trim()) return profile.displayName.trim();
    if (authName?.trim()) return authName.includes('@') ? authName.split('@')[0] : authName.trim();
    if (profile?.email?.trim()) return profile.email.split('@')[0];
    return 'Customer';
  }

  private buildInitial(name: string): string {
    return name.trim().replace(/\s+/g, '').slice(0, 2).toUpperCase() || 'C';
  }
}
