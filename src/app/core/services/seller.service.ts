import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SellerDashboardSnapshot } from '../models/app.models';

@Injectable({
  providedIn: 'root',
})
export class SellerService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  getDashboardSnapshot(sellerId: string): Observable<SellerDashboardSnapshot> {
    return this.http.get<SellerDashboardSnapshot>(`${this.apiBaseUrl}/seller/${sellerId}/dashboard`);
  }
}
