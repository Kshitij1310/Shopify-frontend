import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { Subscription, combineLatest, debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { Product } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { ProductService } from '../../../../core/services/product.service';
import { UiService } from '../../../../shared/services/ui.service';
import { CustomerSearchService } from '../../services/customer-search.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class ProductsPageComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly customerSearchService = inject(CustomerSearchService);

  readonly categories = ['All', ...this.productService.categories];

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  pagedProducts: Product[] = [];

  selectedCategory = 'All';
  search = '';
  sort = 'latest';
  readonly defaultImageUrl = '/assets/products/default-lucide.svg';

  pageSize = 8;
  pageIndex = 0;

  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([
        this.productService.watchProducts(),
        this.customerSearchService.query$.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          startWith(''),
        ),
        this.customerSearchService.category$.pipe(
          distinctUntilChanged(),
          startWith('All'),
        ),
        this.customerSearchService.sort$.pipe(
          distinctUntilChanged(),
          startWith('latest'),
        ),
      ]).subscribe(([products, query, category, sort]) => {
        this.allProducts = products;
        this.search = query;
        this.selectedCategory = category;
        this.sort = sort;
        this.applyFilters();
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  applyFilters(): void {
    this.filteredProducts = this.productService.filterAndSort(
      this.allProducts,
      this.selectedCategory,
      this.search,
      this.sort,
    );
    this.pageIndex = 0;
    this.updatePagedProducts();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedProducts();
    this.cdr.markForCheck();
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = this.defaultImageUrl;
  }

  async addToCart(product: Product): Promise<void> {
    if (this.isOutOfStock(product)) {
      this.ui.toast('This product is out of stock');
      return;
    }

    const uid = await this.authService.getCurrentUidAsync();
    if (!uid) {
      this.ui.toast('Please login first');
      return;
    }

    try {
      await this.cartService.addToCart(uid, product, 1);
      this.ui.toast('Added to cart');
    } catch (error: any) {
      this.ui.toast(
        error?.code
          ? `${error.code}: ${error?.message ?? ''}`
          : (error?.message ?? 'Could not add to cart'),
      );
    }
  }

  getStockLabel(product: Product): string {
    const stock = Number(product.quantity ?? 0);
    return stock <= 0 ? 'Out of stock' : `${stock} left`;
  }

  isOutOfStock(product: Product): boolean {
    return Number(product.quantity ?? 0) <= 0;
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

  openProductDetail(productId: string | null | undefined): void {
    if (!productId) {
      return;
    }

    void this.router.navigate(['/customer/products', productId]);
  }

  private updatePagedProducts(): void {
    const start = this.pageIndex * this.pageSize;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.pageSize);
  }
}
