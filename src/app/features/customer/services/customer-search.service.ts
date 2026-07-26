import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomerSearchService {
  private readonly querySubject = new BehaviorSubject<string>('');
  private readonly categorySubject = new BehaviorSubject<string>('All');
  private readonly sortSubject = new BehaviorSubject<string>('latest');

  readonly query$ = this.querySubject.asObservable();
  readonly category$ = this.categorySubject.asObservable();
  readonly sort$ = this.sortSubject.asObservable();

  setQuery(query: string): void {
    this.querySubject.next(query.trim());
  }

  setCategory(category: string): void {
    this.categorySubject.next(category || 'All');
  }

  setSort(sort: string): void {
    this.sortSubject.next(sort || 'latest');
  }
}
