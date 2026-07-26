import { Injectable } from '@angular/core';
import { Order, Product } from '../models/app.models';
import { ChartConfiguration } from 'chart.js';

export interface DashboardMetrics {
  revenue: number;
  revenueChange: number;
  orders: number;
  ordersChange: number;
  units: number;
  unitsChange: number;
  conversionRate: number;
  averageOrderValue: number;
}

export interface TrendData {
  labels: string[];
  revenue: number[];
  orders: number[];
  timestamp: number[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardAnalyticsService {
  /**
   * Generate revenue trend chart config (last 7 days)
   */
  generateRevenueChart(orders: Order[]): ChartConfiguration {
    const trendData = this.calculateLast7DaysTrend(orders);
    
    return {
      type: 'line',
      data: {
        labels: trendData.labels,
        datasets: [
          {
            label: 'Revenue (Rs.)',
            data: trendData.revenue,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            padding: 12,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 12 },
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { callback: (value) => `Rs. ${value}` },
          },
          x: { grid: { display: false } },
        },
      },
    };
  }

  /**
   * Generate orders distribution chart (by status)
   */
  generateOrdersChart(orders: Order[]): ChartConfiguration {
    const success = orders.filter((o) => o.paymentStatus === 'success' && o.status !== 'canceled').length;
    const canceled = orders.filter((o) => o.status === 'canceled').length;
    const failed = orders.filter((o) => o.paymentStatus === 'failed').length;

    return {
      type: 'bar',
      data: {
        labels: ['Success', 'Canceled', 'Failed'],
        datasets: [
          {
            label: 'Orders',
            data: [success, canceled, failed],
            backgroundColor: ['#10b981', '#64748b', '#ef4444'],
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            padding: 12,
          },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
          x: { grid: { display: false } },
        },
      },
    };
  }

  /**
   * Generate category distribution pie chart
   */
  generateCategoryChart(products: Product[]): ChartConfiguration {
    const categoryCount = new Map<string, number>();
    products.forEach((p) => {
      categoryCount.set(p.category, (categoryCount.get(p.category) ?? 0) + 1);
    });

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

    return {
      type: 'doughnut',
      data: {
        labels: Array.from(categoryCount.keys()),
        datasets: [
          {
            data: Array.from(categoryCount.values()),
            backgroundColor: colors.slice(0, categoryCount.size),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 20, font: { size: 12 } },
          },
        },
      },
    };
  }

  /**
   * Calculate metrics for current period vs previous period
   */
  calculateMetricsWithTrend(
    orders: Order[],
    products: Product[],
    sellerItems: (order: Order) => any[]
  ): DashboardMetrics {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    const currentOrders = orders.filter((o) => o.createdAt > thirtyDaysAgo);
    const previousOrders = orders.filter((o) => o.createdAt > sixtyDaysAgo && o.createdAt <= thirtyDaysAgo);

    const currentRevenue = this.calculateRevenue(currentOrders);
    const previousRevenue = this.calculateRevenue(previousOrders);

    const currentUnits = this.calculateUnits(currentOrders, sellerItems);
    const previousUnits = this.calculateUnits(previousOrders, sellerItems);

    return {
      revenue: currentRevenue,
      revenueChange: this.calculatePercentChange(previousRevenue, currentRevenue),
      orders: currentOrders.length,
      ordersChange: this.calculatePercentChange(previousOrders.length, currentOrders.length),
      units: currentUnits,
      unitsChange: this.calculatePercentChange(previousUnits, currentUnits),
      conversionRate: this.calculateConversionRate(currentOrders),
      averageOrderValue: currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0,
    };
  }

  /**
   * Export dashboard data to CSV
   */
  exportToCSV(orders: Order[], metrics: DashboardMetrics): void {
    const csvContent = [
      ['Seller Dashboard Export', new Date().toISOString()],
      [],
      ['METRICS'],
      ['Total Revenue (Rs.)', metrics.revenue],
      ['Revenue Change (%)', metrics.revenueChange],
      ['Total Orders', metrics.orders],
      ['Orders Change (%)', metrics.ordersChange],
      ['Total Units', metrics.units],
      ['Average Order Value (Rs.)', metrics.averageOrderValue],
      [],
      ['RECENT ORDERS'],
      ['Order ID', 'Date', 'Amount (Rs.)', 'Status', 'Payment Status'],
      ...orders.slice(0, 20).map((o) => [
        o.id ?? '-',
        new Date(o.createdAt).toISOString(),
        o.amount,
        o.status,
        o.paymentStatus,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  private calculateLast7DaysTrend(orders: Order[]): TrendData {
    const labels: string[] = [];
    const revenue: number[] = [];
    const orderCounts: number[] = [];
    const timestamp: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayOrders = orders.filter(
        (o) => o.paymentStatus === 'success' && o.createdAt >= dayStart && o.createdAt < dayEnd
      );

      labels.push(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
      revenue.push(dayOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0));
      orderCounts.push(dayOrders.length);
      timestamp.push(dayStart);
    }

    return { labels, revenue, orders: orderCounts, timestamp };
  }

  private calculateRevenue(orders: Order[]): number {
    return orders
      .filter((o) => o.paymentStatus === 'success')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }

  private calculateUnits(orders: Order[], sellerItems: (order: Order) => any[]): number {
    return orders.reduce((sum, order) => {
      return sum + sellerItems(order).reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0);
    }, 0);
  }

  private calculatePercentChange(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private calculateConversionRate(orders: Order[]): number {
    if (orders.length === 0) return 0;
    const successful = orders.filter((o) => o.paymentStatus === 'success').length;
    return (successful / orders.length) * 100;
  }
}
