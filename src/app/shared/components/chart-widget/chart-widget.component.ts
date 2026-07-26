import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-chart-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, BaseChartDirective],
  template: `
    <mat-card class="chart-card">
      <div class="chart-header">
        <h3>{{ title }}</h3>
        @if (subtitle) {
          <p>{{ subtitle }}</p>
        }
      </div>
      <div class="chart-container">
        <canvas
          baseChart
          [type]="chartConfig.type"
          [data]="chartConfig.data"
          [options]="chartConfig.options"
        ></canvas>
      </div>
    </mat-card>
  `,
  styles: [`
    .chart-card {
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      
      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
    }
    
    .chart-header {
      margin-bottom: 20px;
      
      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
      }
      
      p {
        margin: 4px 0 0;
        font-size: 0.85rem;
        color: #64748b;
      }
    }
    
    .chart-container {
      height: 300px;
      position: relative;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartWidgetComponent {
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() chartConfig!: ChartConfiguration;
}
