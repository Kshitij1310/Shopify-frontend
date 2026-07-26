import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

export interface KPIData {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    label: string;
  };
  tone?: 'revenue' | 'orders' | 'units' | 'risk' | 'success' | 'warning';
}

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card [ngClass]="'kpi-card tone-' + (data.tone || 'neutral')">
      @if (data.icon) {
        <p class="kpi-icon" aria-hidden="true">{{ data.icon }}</p>
      }
      <p class="label">{{ data.label }}</p>
      <h3>{{ data.value }}</h3>
      @if (data.subtext) {
        <p class="meta">{{ data.subtext }}</p>
      }
      @if (data.trend) {
        <div class="trend" [ngClass]="data.trend.direction">
          <span>{{ data.trend.label }}</span>
          <strong>{{ data.trend.direction === 'up' ? '↑' : '↓' }} {{ data.trend.percentage }}%</strong>
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .kpi-card {
      padding: 20px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      cursor: default;
      
      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        transform: translateY(-2px);
      }
    }
    
    .kpi-icon {
      font-size: 2rem;
      margin: 0 0 12px;
    }
    
    .label {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    
    h3 {
      margin: 8px 0 4px;
      font-size: 1.8rem;
      font-weight: 800;
    }
    
    .meta {
      font-size: 0.82rem;
      color: #94a3b8;
      margin: 0;
    }
    
    .trend {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      font-size: 0.8rem;
      font-weight: 600;
      
      &.up { color: #16a34a; }
      &.down { color: #dc2626; }
      &.neutral { color: #64748b; }
      
      strong { font-weight: 700; }
    }
    
    .tone-revenue { border-left: 4px solid #10b981; }
    .tone-orders { border-left: 4px solid #3b82f6; }
    .tone-units { border-left: 4px solid #a855f7; }
    .tone-risk { border-left: 4px solid #f59e0b; }
    .tone-success { border-left: 4px solid #16a34a; }
    .tone-warning { border-left: 4px solid #ef4444; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KPICardComponent {
  @Input() data!: KPIData;
}
