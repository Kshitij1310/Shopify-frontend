import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CartItem, Order, Product } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import { UiService } from '../../../../shared/services/ui.service';
import { ChartConfiguration } from 'chart.js';
import { DashboardAnalyticsService } from '../../../../core/services/dashboard-analytics.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly currencyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  private readonly deletingProductIds = new Set<string>();
  readonly defaultProductImageUrl = '/assets/products/default-lucide.svg';

  sellerId = '';
  products: Product[] = [];
  orders: Order[] = [];

  private productsSub?: Subscription;
  private ordersSub?: Subscription;
  private authSub?: Subscription;
  // Chart configurations
  revenueChartConfig: ChartConfiguration | null = null;
  ordersChartConfig: ChartConfiguration | null = null;
  categoryChartConfig: ChartConfiguration | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly ui: UiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly analyticsService: DashboardAnalyticsService,
  ) {}

  get sellerOrders(): Order[] {
    return this.orders
      .filter((order) => this.getSellerItems(order).length > 0)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  get ordersToday(): number {
    const startOfDay = this.getStartOfDayTimestamp();
    return this.sellerOrders.filter((order) => order.createdAt >= startOfDay).length;
  }

  get successfulPaymentsCount(): number {
    return this.sellerOrders.filter((order) => order.paymentStatus === 'success' && order.status !== 'canceled').length;
  }

  get pendingPaymentsCount(): number {
    return this.sellerOrders.filter((order) => order.paymentStatus === 'pending').length;
  }

  get failedPaymentsCount(): number {
    return this.sellerOrders.filter((order) => order.paymentStatus === 'failed').length;
  }

  get canceledOrdersCount(): number {
    return this.sellerOrders.filter((order) => order.status === 'canceled').length;
  }

  get totalRevenue(): number {
    return this.sellerOrders
      .filter((order) => order.paymentStatus === 'success' && order.status !== 'canceled')
      .reduce((sum, order) => sum + this.getSellerOrderTotal(order), 0);
  }

  get todayRevenue(): number {
    const startOfDay = this.getStartOfDayTimestamp();
    return this.sellerOrders
      .filter((order) => order.paymentStatus === 'success' && order.status !== 'canceled' && order.createdAt >= startOfDay)
      .reduce((sum, order) => sum + this.getSellerOrderTotal(order), 0);
  }

  get pendingRevenue(): number {
    return this.sellerOrders
      .filter((order) => order.paymentStatus === 'pending')
      .reduce((sum, order) => sum + this.getSellerOrderTotal(order), 0);
  }

  get averageOrderValue(): number {
    const paidOrders = this.sellerOrders.filter((order) => order.paymentStatus === 'success' && order.status !== 'canceled');
    if (paidOrders.length === 0) {
      return 0;
    }
    return paidOrders.reduce((sum, order) => sum + this.getSellerOrderTotal(order), 0) / paidOrders.length;
  }

  get totalUnitsSold(): number {
    return this.sellerOrders.reduce((sum, order) => {
      const unitsInOrder = this.getSellerItems(order).reduce((itemsSum, item) => itemsSum + item.quantity, 0);
      return sum + unitsInOrder;
    }, 0);
  }

  get paymentSuccessRate(): number {
    if (this.sellerOrders.length === 0) {
      return 0;
    }

    return (this.successfulPaymentsCount / this.sellerOrders.length) * 100;
  }

  get paymentFailureRate(): number {
    if (this.sellerOrders.length === 0) {
      return 0;
    }

    return (this.failedPaymentsCount / this.sellerOrders.length) * 100;
  }

  get catalogQualityRate(): number {
    if (this.products.length === 0) {
      return 100;
    }

    const withImage = this.products.length - this.productsMissingImage;
    return (withImage / this.products.length) * 100;
  }

  get pendingRiskShare(): number {
    if (this.products.length === 0) {
      return 0;
    }

    return (this.lowStockProductsCount / this.products.length) * 100;
  }

  get lowStockProductsCount(): number {
    return this.products.filter((product) => Number(product.quantity ?? 0) > 0 && Number(product.quantity ?? 0) < 5).length;
  }

  get productsMissingImage(): number {
    return this.products.filter((product) => !product.imageUrl?.trim()).length;
  }

  get staleProducts(): number {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.products.filter((product) => product.updatedAt < sevenDaysAgo).length;
  }

  get recentOrders(): Array<{
    id: string;
    createdAt: number;
    status: Order['status'];
    paymentStatus: Order['paymentStatus'];
    customer: string;
    items: number;
    total: number;
  }> {
    return this.sellerOrders.slice(0, 6).map((order) => {
      const sellerItems = this.getSellerItems(order);
      return {
        id: order.id ?? '-',
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        customer: order.address?.fullName || 'Customer',
        items: sellerItems.reduce((sum, item) => sum + item.quantity, 0),
        total: this.getSellerOrderTotal(order),
      };
    });
  }

  get topProducts(): Array<{ name: string; units: number; revenue: number }> {
    const aggregate = new Map<string, { name: string; units: number; revenue: number }>();

    for (const order of this.sellerOrders) {
      for (const item of this.getSellerItems(order)) {
        const key = item.productId;
        const current = aggregate.get(key) ?? {
          name: item.product.name,
          units: 0,
          revenue: 0,
        };
        current.units += item.quantity;
        current.revenue += item.quantity * item.product.price;
        aggregate.set(key, current);
      }
    }

    return Array.from(aggregate.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  formatCurrency(value: number): string {
    return this.currencyFormatter.format(Math.round(value));
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = this.defaultProductImageUrl;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getOrderStatusClass(status: Order['status']): string {
    if (status === 'placed') {
      return 'chip placed';
    }

    if (status === 'canceled') {
      return 'chip canceled';
    }

    return 'chip failed';
  }

  getProductInitial(name: string): string {
    return (name.trim().charAt(0) || 'P').toUpperCase();
  }

  getTopProductShare(revenue: number): number {
    const topRevenue = this.topProducts[0]?.revenue ?? 0;
    if (topRevenue === 0) {
      return 0;
    }

    return Math.min(100, (revenue / topRevenue) * 100);
  }

  isDeleting(productId: string): boolean {
    return this.deletingProductIds.has(productId);
  }

  async deleteProduct(product: Product): Promise<void> {
    if (!product.id || this.isDeleting(product.id)) {
      return;
    }

    const shouldDelete = window.confirm(`Delete \"${product.name}\"? This action cannot be undone.`);
    if (!shouldDelete) {
      return;
    }

    this.deletingProductIds.add(product.id);
    try {
      await this.productService.deleteProduct(product.id);
      this.ui.toast('Product deleted');
    } catch (error: any) {
      this.ui.toast(error?.message ?? 'Delete failed');
    } finally {
      this.deletingProductIds.delete(product.id);
    }
  }

  ngOnInit(): void {
    this.authSub = this.authService.authState$.subscribe((user) => {
      Promise.resolve().then(() => {
        const uid = user?.uid ?? '';

        if (!uid) {
          this.sellerId = '';
          this.products = [];
          this.orders = [];
          this.revenueChartConfig = null;
          this.ordersChartConfig = null;
          this.categoryChartConfig = null;
          this.disconnectSellerStreams();
          this.cdr.markForCheck();
          return;
        }

        if (uid === this.sellerId) {
          return;
        }

        this.sellerId = uid;
        this.connectSellerStreams(uid);
        this.cdr.markForCheck();
      });
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.disconnectSellerStreams();
  }

  private connectSellerStreams(uid: string): void {
    this.disconnectSellerStreams();

    this.productsSub = this.productService
      .watchSellerProducts(uid)
      .subscribe((products) => {
        Promise.resolve().then(() => {
          this.products = products;
          this.generateCharts();
          this.cdr.markForCheck();
        });
      });

    this.ordersSub = this.orderService
      .watchSellerOrders(uid)
      .subscribe((orders) => {
        Promise.resolve().then(() => {
          this.orders = orders;
          this.generateCharts();
          this.cdr.markForCheck();
        });
      });

  }

  private disconnectSellerStreams(): void {
    this.productsSub?.unsubscribe();
    this.ordersSub?.unsubscribe();
    this.productsSub = undefined;
    this.ordersSub = undefined;
  }

  private getSellerItems(order: Order): CartItem[] {
    return order.items.filter((item) => item.product.sellerId === this.sellerId);
  }

  private getSellerOrderTotal(order: Order): number {
    return this.getSellerItems(order).reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }

  private getStartOfDayTimestamp(): number {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return startOfDay.getTime();
  }

  private generateCharts(): void {
    try {
      this.revenueChartConfig = this.analyticsService.generateRevenueChart(this.orders);
      this.ordersChartConfig = this.analyticsService.generateOrdersChart(this.orders);
      this.categoryChartConfig = this.analyticsService.generateCategoryChart(this.products);
    } catch {
      this.revenueChartConfig = null;
      this.ordersChartConfig = null;
      this.categoryChartConfig = null;
    }
  }
}
