import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    callback: () => void;
  };
  dismissible?: boolean;
}

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="alert" [ngClass]="'alert-' + alert.type">
      <div class="alert-content">
        <p class="alert-title">{{ alert.title }}</p>
        <p class="alert-message">{{ alert.message }}</p>
      </div>
      <div class="alert-actions">
        @if (alert.action) {
          <button (click)="alert.action.callback()">{{ alert.action.label }}</button>
        }
        @if (alert.dismissible) {
          <button class="dismiss" (click)="onDismiss()">✕</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .alert {
      padding: 14px 16px;
      border-radius: 10px;
      border-left: 4px solid;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      animation: slideIn 0.3s ease;
      
      &.alert-error {
        background: #fee2e2;
        border-color: #dc2626;
      }
      &.alert-warning {
        background: #fef3c7;
        border-color: #f59e0b;
      }
      &.alert-info {
        background: #dbeafe;
        border-color: #3b82f6;
      }
      &.alert-success {
        background: #dcfce7;
        border-color: #16a34a;
      }
    }
    
    .alert-content {
      flex: 1;
    }
    
    .alert-title {
      margin: 0;
      font-weight: 700;
      font-size: 0.9rem;
    }
    
    .alert-message {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: #4b5563;
    }
    
    .alert-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    button {
      background: none;
      border: none;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(0, 0, 0, 0.1);
      }
      
      &.dismiss {
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
    
    @keyframes slideIn {
      from { transform: translateX(-20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  @Input() alert!: Alert;
  
  onDismiss() {
    // Parent component should track and remove this alert
  }
}
