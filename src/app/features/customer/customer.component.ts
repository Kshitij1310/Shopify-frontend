import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { UserProfile } from '../../core/models/app.models';
import { AuthService } from '../../core/services/auth.service';
import { ProductService } from '../../core/services/product.service';
import { ThemeService } from '../../core/services/theme.service';
import { CustomerSearchService } from './services/customer-search.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customer',
  standalone: false,
  templateUrl: './customer.component.html',
  styleUrl: './customer.component.scss',
})
export class Customer {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly searchService = inject(CustomerSearchService);
  private readonly themeService = inject(ThemeService);

  readonly authState$ = this.authService.authState$;
  readonly profile$ = this.authService.profile$;
  readonly userName$ = combineLatest([this.authState$, this.profile$]).pipe(
    map(([user, profile]) => this.getDisplayName(profile, user?.displayName ?? user?.email ?? null)),
  );
  readonly userBadge$ = this.userName$.pipe(
    map((name) => ({
      name,
      initial: (name.trim().replace(/\s+/g, '').slice(0, 2).toUpperCase() || 'C'),
    })),
  );
  readonly categories = ['All', ...this.productService.categories];
  isDarkMode = this.themeService.currentTheme === 'dark';

  search = '';
  selectedCategory = 'All';
  selectedSort = 'latest';

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/auth/login']);
  }

  toggleDarkMode(): void {
    this.isDarkMode = this.themeService.toggleTheme() === 'dark';
  }

  onSearchChange(): void {
    this.onSearch(this.searchText ?? '');
  }

  onSearch(value: string): void {
    this.search = value;
    this.searchService.setQuery(value);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.searchService.setCategory(category);
  }

  onSortChange(sort: string): void {
    this.selectedSort = sort;
    this.searchService.setSort(sort);
  }

  private getDisplayName(profile: UserProfile | null, authName: string | null): string {
    if (profile?.displayName?.trim()) {
      return profile.displayName.trim();
    }

    if (authName?.trim()) {
      return authName.includes('@') ? authName.split('@')[0] : authName.trim();
    }

    if (profile?.email?.trim()) {
      return profile.email.split('@')[0];
    }

    return 'Customer';
  }

  searchText = '';
}
