import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { WalletTransaction } from '../models/app.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly ngZone = inject(NgZone);
  private readonly http = inject(HttpClient);

  watchBalance(uid: string): Observable<number> {
    return this.http.get<any>(`${environment.apiBaseUrl}/users/${uid}`).pipe(
      map((u) => Number(u?.walletBalance ?? 0)),
      catchError(() => of(0)),
    );
  }

  async addMoney(uid: string, amount: number): Promise<void> {
    await this.adjustBalance(uid, amount, 'credit', 'Wallet top-up');
  }

  async deductMoney(uid: string, amount: number): Promise<void> {
    await this.adjustBalance(uid, -Math.abs(amount), 'debit', 'Order payment');
  }

  private async adjustBalance(uid: string, delta: number, type: WalletTransaction['type'], note: string): Promise<void> {
    // Backend endpoints for wallet may not exist yet; attempt to update user profile walletBalance
    const user = await this.http.get<any>(`${environment.apiBaseUrl}/users/${uid}`).toPromise();
    const current = Number(user?.walletBalance ?? 0);
    const updated = Math.max(0, current + delta);
    await this.http.put(`${environment.apiBaseUrl}/users/${uid}`, { walletBalance: updated }).toPromise();
    await this.http.post(`${environment.apiBaseUrl}/wallet-transactions`, { uid, type, amount: Math.abs(delta), note, createdAt: Date.now() }).toPromise();
  }
}
