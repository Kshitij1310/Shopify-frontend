import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, shareReplay } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DEMO_PRODUCTS } from '../data/demo-products';
import { Product } from '../models/app.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly ngZone = inject(NgZone);
  private readonly http = inject(HttpClient);
  private productsCache$?: Observable<Product[]>;
  private readonly productCache = new Map<string, Observable<Product | null>>();
  private readonly sellerProductsCache = new Map<string, Observable<Product[]>>();
  private static readonly SERVER_BASE = environment.apiBaseUrl.replace(/\/api\/?$/, '');
  private static readonly STATIC_ASSET_BASE = '/assets/products';
  private static readonly DEFAULT_ASSET_IMAGE = `${ProductService.STATIC_ASSET_BASE}/default-lucide.svg`;
  private static readonly FALLBACK_IMAGE_POOL = [
    `${ProductService.STATIC_ASSET_BASE}/headphones.svg`,
    `${ProductService.STATIC_ASSET_BASE}/backpack.svg`,
    `${ProductService.STATIC_ASSET_BASE}/coffee.svg`,
    `${ProductService.STATIC_ASSET_BASE}/lamp.svg`,
    `${ProductService.STATIC_ASSET_BASE}/book.svg`,
    `${ProductService.STATIC_ASSET_BASE}/yoga-mat.svg`,
    `${ProductService.STATIC_ASSET_BASE}/fitness-band.svg`,
    `${ProductService.STATIC_ASSET_BASE}/bowls.svg`,
    `${ProductService.STATIC_ASSET_BASE}/beauty.svg`,
    `${ProductService.STATIC_ASSET_BASE}/office.svg`,
    `${ProductService.STATIC_ASSET_BASE}/kitchen.svg`,
    `${ProductService.STATIC_ASSET_BASE}/toys.svg`,
    `${ProductService.STATIC_ASSET_BASE}/petcare.svg`,
    `${ProductService.STATIC_ASSET_BASE}/stationery.svg`,
    `${ProductService.STATIC_ASSET_BASE}/health.svg`,
    `${ProductService.STATIC_ASSET_BASE}/travel.svg`,
  ];
  private static readonly CATEGORY_FALLBACKS: Record<string, string> = {
    electronics: `${ProductService.STATIC_ASSET_BASE}/fitness-band.svg`,
    fashion: `${ProductService.STATIC_ASSET_BASE}/backpack.svg`,
    grocery: `${ProductService.STATIC_ASSET_BASE}/coffee.svg`,
    home: `${ProductService.STATIC_ASSET_BASE}/lamp.svg`,
    books: `${ProductService.STATIC_ASSET_BASE}/book.svg`,
    sports: `${ProductService.STATIC_ASSET_BASE}/yoga-mat.svg`,
    beauty: `${ProductService.STATIC_ASSET_BASE}/beauty.svg`,
    office: `${ProductService.STATIC_ASSET_BASE}/office.svg`,
    kitchen: `${ProductService.STATIC_ASSET_BASE}/kitchen.svg`,
    toys: `${ProductService.STATIC_ASSET_BASE}/toys.svg`,
    'pet care': `${ProductService.STATIC_ASSET_BASE}/petcare.svg`,
    stationery: `${ProductService.STATIC_ASSET_BASE}/stationery.svg`,
    health: `${ProductService.STATIC_ASSET_BASE}/health.svg`,
    travel: `${ProductService.STATIC_ASSET_BASE}/travel.svg`,
  };

  readonly categories = [
    'Electronics',
    'Fashion',
    'Grocery',
    'Home',
    'Books',
    'Sports',
    'Beauty',
    'Office',
    'Kitchen',
    'Toys',
    'Pet Care',
    'Stationery',
    'Health',
    'Travel',
  ];

  watchProducts(): Observable<Product[]> {
    if (!this.productsCache$) {
      this.productsCache$ = this.http.get<Product[]>(`${environment.apiBaseUrl}/products`).pipe(
        map((items) =>
          items
            .map((p) => ({ ...p, imageUrl: this.toAssetImageUrl(p) }))
            .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
        ),
        catchError(() => of(DEMO_PRODUCTS.map((p) => ({ ...p, imageUrl: this.toAssetImageUrl(p) })))),
        shareReplay(1),
      );
    }

    return this.productsCache$;
  }

  watchProduct(productId: string): Observable<Product | null> {
    const key = productId.trim();
    if (!this.productCache.has(key)) {
      this.productCache.set(
        key,
        this.http.get<Product>(`${environment.apiBaseUrl}/products/${key}`).pipe(
          map((p) => ({ ...p, imageUrl: this.toAssetImageUrl(p) })),
          catchError((err: HttpErrorResponse) => {
            if (err.status === 404) {
              const fallback = DEMO_PRODUCTS.find((p) => p.id === key);
              return of(fallback ? { ...fallback, imageUrl: this.toAssetImageUrl(fallback) } : null);
            }
            return of(null);
          }),
          shareReplay(1),
        ),
      );
    }

    return this.productCache.get(key) ?? of(null);
  }

  watchSellerProducts(sellerId: string): Observable<Product[]> {
    const key = sellerId.trim();
    if (!this.sellerProductsCache.has(key)) {
      this.sellerProductsCache.set(
        key,
        this.http.get<Product[]>(`${environment.apiBaseUrl}/products/seller/${key}`).pipe(
          map((items) => items.map((p) => ({ ...p, imageUrl: this.toAssetImageUrl(p) })).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))),
          catchError(() => of([])),
          shareReplay(1),
        ),
      );
    }

    return this.sellerProductsCache.get(key) ?? of([]);
  }

  filterAndSort(
    products: Product[],
    category: string,
    search: string,
    sort: string,
  ): Product[] {
    let output = [...products];
    if (category && category !== 'All') {
      output = output.filter((p) => p.category === category);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      output = output.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term),
      );
    }
    if (sort === 'priceAsc') {
      output.sort((a, b) => a.price - b.price);
    } else if (sort === 'priceDesc') {
      output.sort((a, b) => b.price - a.price);
    } else {
      output.sort((a, b) => b.createdAt - a.createdAt);
    }
    return output;
  }

  async addProduct(
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    await this.http.post(`${environment.apiBaseUrl}/products`, product).toPromise();
    this.clearProductCaches();
  }

  async updateProduct(
    productId: string,
    payload: Partial<Omit<Product, 'id' | 'createdAt' | 'sellerId'>>,
    sellerId: string,
  ): Promise<void> {
    await this.http.put(`${environment.apiBaseUrl}/products/${productId}`, payload).toPromise();
    this.clearProductCaches(productId);
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.http.delete(`${environment.apiBaseUrl}/products/${productId}`).toPromise();
    this.clearProductCaches(productId);
  }

  async getProductSnapshot(productId: string): Promise<Product | null> {
    try {
      const p = await this.watchProduct(productId).toPromise();
      if (!p) {
        const fallback = DEMO_PRODUCTS.find((p) => p.id === productId);
        return fallback ? { ...fallback, imageUrl: this.toAssetImageUrl(fallback) } : null;
      }
      return { ...p, imageUrl: this.toAssetImageUrl(p) } as Product;
    } catch {
      const fallback = DEMO_PRODUCTS.find((p) => p.id === productId);
      return fallback ? { ...fallback, imageUrl: this.toAssetImageUrl(fallback) } : null;
    }
  }

  async uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await this.http.post<{ imageUrl: string }>(`${environment.apiBaseUrl}/products/upload-image`, fd).toPromise();
    return res?.imageUrl ?? '';
  }

  resolveImageUrl(product: Partial<Product>): string {
    return this.toAssetImageUrl(product);
  }

  private toAssetImageUrl(product: Partial<Product>): string {
    const raw = (product.imageUrl ?? '').trim();

    if (raw) {
      // allow data URLs and absolute http(s) urls
      if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
        return raw;
      }

      // server-side uploaded images return paths like '/uploads/{filename}'
      if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) {
        return `${ProductService.SERVER_BASE}${raw.startsWith('/') ? raw : '/' + raw}`;
      }

      const normalized = raw
        .replaceAll('\\', '/')
        .replace(/^\.\//, '')
        .replace(/^\//, '')
        .replace(/^src\//, '');

      if (normalized.startsWith('assets/products/')) {
        // Product images live on the Spring Boot server, not in Angular's public folder.
        // Serve them from the backend base URL (e.g. http://localhost:8081).
        return `${ProductService.SERVER_BASE}/${normalized}`;
      }

      if (normalized.startsWith('assets/')) {
        // Non-product assets (SVGs etc.) stay local to Angular
        return `/${normalized}`;
      }

      if (normalized.endsWith('/default-lucide.svg') || normalized.endsWith('default-lucide.svg')) {
        return this.pickFallbackImage(product);
      }

      if (normalized.startsWith('products/')) {
        return `${ProductService.SERVER_BASE}/assets/products/${normalized.slice('products/'.length)}`;
      }
    }

    return this.pickFallbackImage(product);
  }

  private pickFallbackImage(product: Partial<Product>): string {
    const seed = `${product.id ?? ''}|${product.name ?? ''}|${product.category ?? ''}`.trim();
    if (!seed) {
      return ProductService.DEFAULT_ASSET_IMAGE;
    }

    let hash = 0;
    for (let index = 0; index < seed.length; index++) {
      hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }

    return ProductService.FALLBACK_IMAGE_POOL[hash % ProductService.FALLBACK_IMAGE_POOL.length] ?? ProductService.DEFAULT_ASSET_IMAGE;
  }

  private clearProductCaches(productId?: string): void {
    this.productsCache$ = undefined;
    this.productCache.clear();
    this.sellerProductsCache.clear();

    if (productId) {
      this.productCache.delete(productId.trim());
    }
  }
}