import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'ecommerce-theme-mode';
  private readonly themeSubject = new BehaviorSubject<ThemeMode>(this.readStoredTheme());

  readonly theme$ = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  get currentTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  toggleTheme(): ThemeMode {
    const nextTheme = this.themeSubject.value === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
    return nextTheme;
  }

  setTheme(theme: ThemeMode): void {
    this.themeSubject.next(theme);
    this.persistTheme(theme);
    this.applyTheme(theme);
  }

  private readStoredTheme(): ThemeMode {
    if (typeof localStorage === 'undefined') {
      return 'light';
    }

    const storedTheme = localStorage.getItem(this.storageKey);
    return storedTheme === 'dark' ? 'dark' : 'light';
  }

  private persistTheme(theme: ThemeMode): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, theme);
  }

  private applyTheme(theme: ThemeMode): void {
    const root = this.document.documentElement;
    root.classList.toggle('dark-mode', theme === 'dark');
    root.setAttribute('data-theme', theme);

    const body = this.document.body;
    body.classList.toggle('dark-mode', theme === 'dark');
  }
}