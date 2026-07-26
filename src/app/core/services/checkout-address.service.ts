import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderAddress } from '../models/app.models';

export interface SavedCheckoutAddress extends OrderAddress {
  id: string;
  uid: string;
  isDefault: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutAddressService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  watchAddresses(uid: string): Observable<SavedCheckoutAddress[]> {
    return this.http.get<SavedCheckoutAddress[]>(`${this.apiBaseUrl}/checkout-addresses/${uid}`);
  }

  saveAddress(uid: string, address: OrderAddress, isDefault: boolean): Observable<SavedCheckoutAddress> {
    return this.http.post<SavedCheckoutAddress>(`${this.apiBaseUrl}/checkout-addresses/${uid}`, {
      ...address,
      isDefault,
    });
  }
}