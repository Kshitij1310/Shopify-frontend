import { Injectable, Injector } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  constructor(private readonly injector: Injector) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('auth.token');
    const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
    // Consider relative and absolute API URLs as backend requests. This helps when services
    // call '/api/...' (relative) instead of the full environment.apiBaseUrl.
    const isBackendRequest =
      req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith('/api') || req.url.includes('/api/');

    // Attach the JWT to authenticated backend calls, but never to login/register.
    const shouldAttach = !!token && !req.headers.has('Authorization') && !isAuthEndpoint && (environment.production ? isBackendRequest : true);

    if (!shouldAttach) {
      return next.handle(req).pipe(
        catchError((err: HttpErrorResponse) => this.handleAuthError(err)),
      );
    }

    return next
      .handle(
        req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        }),
      )
      .pipe(catchError((err: HttpErrorResponse) => this.handleAuthError(err)));
  }

  private handleAuthError(err: HttpErrorResponse) {
    if (err && (err.status === 401 || err.status === 403)) {
      try {
        const router = this.injector.get(Router);
        const auth = this.injector.get(AuthService);
        if (err.status === 401) {
          auth.clearSession();
        }
        void router.navigate(['/auth/login'], { replaceUrl: true });
      } catch {
        // ignore navigation errors
      }
    }

    return throwError(() => err);
  }
}