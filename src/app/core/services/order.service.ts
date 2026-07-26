import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Order } from '../models/app.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly ngZone = inject(NgZone);
  private readonly http = inject(HttpClient);

  async placeOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
    const created = await this.http.post<Order>(`${environment.apiBaseUrl}/orders`, { ...order }).toPromise();
    return (created?.id ?? '') as string;
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.http.put(`${environment.apiBaseUrl}/orders/id/${orderId}`, { status: 'canceled' }).toPromise();
  }

  watchCustomerOrders(uid: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${environment.apiBaseUrl}/orders/${uid}`).pipe(catchError(() => of([])));
  }

  watchSellerOrders(sellerId: string): Observable<Order[]> {
    // backend does not expose seller-specific endpoint by default; fallback to empty
    return of([]);
  }
}
