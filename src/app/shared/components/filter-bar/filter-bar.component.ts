import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

export interface DashboardFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  category?: string;
  status?: 'success' | 'pending' | 'failed';
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  template: `
    <div class="filter-bar">
      <form [formGroup]="filterForm" (ngSubmit)="onApplyFilters()">
        <mat-form-field appearance="outline">
          <mat-label>Start Date</mat-label>
          <input matInput [matDatepicker]="picker1" formControlName="startDate" />
          <mat-datepicker-toggle matIconSuffix [for]="picker1"></mat-datepicker-toggle>
          <mat-datepicker #picker1></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>End Date</mat-label>
          <input matInput [matDatepicker]="picker2" formControlName="endDate" />
          <mat-datepicker-toggle matIconSuffix [for]="picker2"></mat-datepicker-toggle>
          <mat-datepicker #picker2></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="">All</mat-option>
            <mat-option value="success">Success</mat-option>
            <mat-option value="pending">Pending</mat-option>
            <mat-option value="failed">Failed</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            <mat-option value="">All Categories</mat-option>
            @for (cat of categories; track cat) {
              <mat-option [value]="cat">{{ cat }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="actions">
          <button mat-flat-button color="primary" type="submit">Apply Filters</button>
          <button mat-stroked-button type="button" (click)="onReset()">Reset</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .filter-bar {
      background: #fff;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      margin-bottom: 24px;

      form {
        display: flex;
        gap: 12px;
        align-items: flex-end;
        flex-wrap: wrap;

        mat-form-field {
          flex: 1;
          min-width: 160px;
        }
      }
    }

    .actions {
      display: flex;
      gap: 8px;

      button {
        white-space: nowrap;
      }
    }

    @media (max-width: 768px) {
      .filter-bar form {
        flex-direction: column;

        mat-form-field {
          width: 100%;
        }
      }

      .actions {
        width: 100%;

        button {
          flex: 1;
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterBarComponent {
  @Output() filterChange = new EventEmitter<DashboardFilters>();

  filterForm: FormGroup;
  categories = ['Electronics', 'Fashion', 'Home', 'Sports', 'Books', 'Grocery'];

  constructor(private fb: FormBuilder) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.filterForm = this.fb.group({
      startDate: [thirtyDaysAgo],
      endDate: [today],
      status: [''],
      category: [''],
    });
  }

  onApplyFilters(): void {
    const { startDate, endDate, status, category } = this.filterForm.value;

    this.filterChange.emit({
      dateRange: { start: startDate, end: endDate },
      status: status || undefined,
      category: category || undefined,
    });
  }

  onReset(): void {
    this.filterForm.reset();
    this.onApplyFilters();
  }
}
