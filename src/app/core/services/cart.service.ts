import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { CartItem, Product, WishlistItem } from '../models/app.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly ngZone = inject(NgZone);
  private readonly http = inject(HttpClient);

watchCart(uid: string): Observable<CartItem[]> {
  return this.http.get<any[]>(`${environment.apiBaseUrl}/cart/${uid}`).pipe(
    map((items) => {
      return (items ?? []).map((i) => {

        let product: any = {};

        // Parse productJson from backend
        if (i.productJson) {
          try {
            product = JSON.parse(i.productJson);
          } catch (e) {
            console.error('Failed to parse productJson', e);
          }
        }

        return {
          id: i.id,
          uid: i.uid,
          productId: i.productId,
          quantity: Number(i.quantity ?? 1),

          product: {
            id: product.id || i.productId,
            name: product.name || 'Unknown product',
            price: Number(product.price ?? 0),
            quantity: Number(product.quantity ?? 0),
            category: product.category || '',
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            sellerId: product.sellerId || '',
            createdAt: Number(product.createdAt ?? 0),
            updatedAt: Number(product.updatedAt ?? 0),
          },
        };
      });
    }),
    catchError((err) => {
      console.error('Failed to load cart:', err);
      return of([]);
    }),
  );
}

  watchWishlist(uid: string): Observable<WishlistItem[]> {
  return this.http.get<any>(`${environment.apiBaseUrl}/wishlist/${uid}`).pipe(
    tap((response: any) => {
      console.log('[CartService] Raw wishlist API response:', response);
    }),

    map((items: any) => {
      const itemArray = Array.isArray(items)
        ? items
        : (items?.data || items?.items || []);

      return itemArray.map((item: any) => {

        let product = item.product || {};

        // IMPORTANT FIX
        if (
          Object.keys(product).length === 0 &&
          item.productJson
        ) {
          try {
            product = JSON.parse(item.productJson);
          } catch (e) {
            console.error('Invalid productJson', e);
          }
        }

        return {
          id: item.id,
          uid: item.uid,
          productId: item.productId,

          product: {
            id: product.id || item.productId,

            name:
              product.name ||
              item.productName ||
              item.name ||
              'Unknown Product',

            price: Number(
              product.price ??
              item.price ??
              0
            ),

            quantity: Number(
              product.quantity ??
              0
            ),

            category:
              product.category ||
              item.category ||
              '',

            description:
              product.description ||
              item.description ||
              '',

            imageUrl:
              product.imageUrl ||
              item.imageUrl ||
              '',

            sellerId:
              product.sellerId ||
              item.sellerId ||
              '',

            createdAt: Number(
              product.createdAt ??
              item.createdAt ??
              0
            ),

            updatedAt: Number(
              product.updatedAt ??
              item.updatedAt ??
              0
            ),
          },
        };
      });
    }),

    catchError((err) => {
      console.error('Failed to load wishlist:', err);
      return of([]);
    }),
  );
}

  async addToCart(uid: string, product: Product, quantity = 1): Promise<void> {
    const productId = product.id;
    if (!productId) {
      throw new Error('Product id missing');
    }

    const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
    const productPayload = this.toProductPayload(product, productId);
    await this.http.post(`${environment.apiBaseUrl}/cart`, { uid, userId: uid, productId, quantity: safeQuantity, product: productPayload }).toPromise();
  }

  async updateCartQuantity(itemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.http.delete(`${environment.apiBaseUrl}/cart/${itemId}`).toPromise();
      return;
    }
    await this.http.put(`${environment.apiBaseUrl}/cart/${itemId}`, { quantity }).toPromise();
  }

  async removeFromCart(itemId: string): Promise<void> {
    await this.http.delete(`${environment.apiBaseUrl}/cart/${itemId}`).toPromise();
  }

  async clearCart(uid: string): Promise<void> {
    // no bulk clear endpoint; fetch and delete each
    const items = await this.http.get<CartItem[]>(`${environment.apiBaseUrl}/cart/${uid}`).toPromise();
    await Promise.all((items ?? []).map((it) => this.http.delete(`${environment.apiBaseUrl}/cart/${it.id}`).toPromise()));
  }

  async addToWishlist(uid: string, product: Product): Promise<void> {
    const productId = product.id;
    if (!productId) {
      throw new Error('Product id missing');
    }
    await this.http.post(`${environment.apiBaseUrl}/wishlist`, { uid, userId: uid, productId, product: this.toProductPayload(product, productId) }).toPromise();
  }

  async removeFromWishlist(itemId: string): Promise<void> {
    await this.http.delete(`${environment.apiBaseUrl}/wishlist/${itemId}`).toPromise();
  }

  private toProductPayload(product: Product, productId: string): Product {
    return {
      id: productId,
      name: product.name ?? '',
      price: Number(product.price ?? 0),
      quantity: Number(product.quantity ?? 0),
      category: product.category ?? '',
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      sellerId: product.sellerId ?? '',
      createdAt: Number(product.createdAt ?? Date.now()),
      updatedAt: Number(product.updatedAt ?? Date.now()),
    };
  }
}
