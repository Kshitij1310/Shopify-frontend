import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, filter, firstValueFrom, of, shareReplay, switchMap, take, timeout } from 'rxjs';
import { UserProfile, UserRole } from '../models/app.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private static readonly MAX_PROFILE_PHOTO_SIZE_BYTES = 350 * 1024;
  private readonly profileCache = new Map<string, Observable<UserProfile | null>>();
  // emit a lightweight user-like object so existing components expecting user.displayName/user.email continue to work
  private readonly authStateSubject = new BehaviorSubject<any | null>(
    localStorage.getItem('auth.token') && localStorage.getItem('auth.uid')
      ? { uid: localStorage.getItem('auth.uid') }
      : null,
  );
  readonly authState$ = this.authStateSubject.asObservable();

  readonly profile$ = this.authState$.pipe(
    switchMap((user) => (user ? this.watchProfile(user.uid) : of(null))),
    shareReplay(1),
    catchError(() => of(null)),
  );

  private readonly http = inject(HttpClient);
  private readonly ngZone = inject(NgZone);

  constructor() {}

  async signup(name: string, email: string, password: string, role: UserRole): Promise<void> {
    const body = { name, email, password, role };
    const res = await this.http.post<{ token: string; userId: string }>(`${environment.apiBaseUrl}/auth/register`, body).toPromise();
    if (res?.token && res.userId) {
      localStorage.setItem('auth.token', res.token);
      localStorage.setItem('auth.uid', res.userId);
      this.authStateSubject.next({ uid: res.userId });
    }
  }

  async login(email: string, password: string): Promise<void> {
    const res = await this.http.post<{ token: string; userId: string }>(`${environment.apiBaseUrl}/auth/login`, { email, password }).toPromise();
    if (res?.token && res.userId) {
      localStorage.setItem('auth.token', res.token);
      localStorage.setItem('auth.uid', res.userId);
      this.authStateSubject.next({ uid: res.userId });
    }
  }

  async forgotPassword(email: string): Promise<void> {
    // Backend does not currently expose password reset; fallback no-op
    return Promise.resolve();
  }

  async logout(): Promise<void> {
    try {
      await this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}).toPromise();
    } catch {
      // Ignore logout endpoint failures and clear the local session anyway.
    } finally {
      this.clearSession();
    }
  }

  clearSession(): void {
    localStorage.removeItem('auth.token');
    localStorage.removeItem('auth.uid');
    this.profileCache.clear();
    this.authStateSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth.token') && !!localStorage.getItem('auth.uid');
  }

  /**
   * Keep the in-memory auth state aligned with local storage.
   * Token validity is enforced by the HTTP interceptor.
   */
  async validateStoredSession(): Promise<boolean> {
    if (!this.isLoggedIn()) {
      this.clearSession();
      return false;
    }

    const uid = localStorage.getItem('auth.uid');
    if (uid) {
      this.authStateSubject.next({ uid });
    }

    return true;
  }

  async updateProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    await this.http.put(`${environment.apiBaseUrl}/users/${uid}`, updates).toPromise();
  }

  async uploadProfilePhoto(uid: string, file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('invalid-image-type');
    }

    if (file.size > AuthService.MAX_PROFILE_PHOTO_SIZE_BYTES) {
      throw new Error('image-too-large');
    }

    // keep same client-side preview behaviour
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('file-read-failed'));
      reader.readAsDataURL(file);
    });
  }

  async getProfileByUid(uid: string): Promise<UserProfile | null> {
    try {
      return (await firstValueFrom(this.getProfileStream(uid))) ?? null;
    } catch {
      return null;
    }
  }

  getCurrentUid(): string | null {
    return this.authStateSubject.value?.uid ?? null;
  }

  async getCurrentUidAsync(timeoutMs = 5000): Promise<string | null> {
    const existing = this.getCurrentUid();
    if (existing) {
      return existing;
    }

    try {
      const user = await firstValueFrom(
        this.authState$.pipe(
          filter((u): u is { uid: string } => !!u && !!u.uid),
          take(1),
          timeout(timeoutMs),
        ),
      );
      return user.uid;
    } catch {
      return null;
    }
  }

  private watchProfile(uid: string): Observable<UserProfile | null> {
    return this.getProfileStream(uid);
  }

  private getProfileStream(uid: string): Observable<UserProfile | null> {
    const cached = this.profileCache.get(uid);
    if (cached) {
      return cached;
    }

    const request$ = this.http.get<UserProfile>(`${environment.apiBaseUrl}/users/${uid}`).pipe(
      catchError(() => of(null)),
      shareReplay(1),
    );

    this.profileCache.set(uid, request$);
    return request$;
  }
}
