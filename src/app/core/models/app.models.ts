export type UserRole = 'customer' | 'partner';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  walletBalance: number;
  displayName?: string;
  phone?: string;
  photoURL?: string;
}

export interface Product {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  description: string;
  imageUrl: string;
  sellerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  id?: string;
  uid: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface WishlistItem {
  id?: string;
  uid: string;
  productId: string;
  product: Product;
}

export interface OrderAddress {
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
}

export interface Order {
  id?: string;
  uid: string;
  items: CartItem[];
  amount: number;
  status: 'placed' | 'failed' | 'canceled';
  paymentStatus: 'success' | 'failed' | 'pending';
  paymentMethod?: 'upi' | 'card' | 'wallet';
  couponCode?: string;
  paymentReferenceId?: string;
  sellerIds: string[];
  address: OrderAddress;
  createdAt: number;
}

export interface WalletTransaction {
  id?: string;
  uid: string;
  type: 'credit' | 'debit';
  amount: number;
  note: string;
  createdAt: number;
}

export interface SellerRevenueTrendPoint {
  dayStartUtcMs: number;
  revenue: number;
}

export interface SellerOrdersDistribution {
  success: number;
  pending: number;
  failed: number;
  canceled: number;
}

export interface SellerCategoryDistributionItem {
  category: string;
  count: number;
}

export interface SellerRecentOrder {
  id: string;
  createdAt: number;
  amount: number;
  status: string;
  paymentStatus: string;
}

export interface SellerTopProduct {
  id: string;
  name: string;
  revenue: number;
}

export interface SellerDashboardSnapshot {
  sellerId: string;
  totalOrders: number;
  ordersToday: number;
  successfulPaymentsCount: number;
  pendingPaymentsCount: number;
  failedPaymentsCount: number;
  canceledOrdersCount: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingRevenue: number;
  averageOrderValue: number;
  totalUnitsSold: number;
  paymentSuccessRate: number;
  paymentFailureRate: number;
  catalogQualityRate: number;
  pendingRiskShare: number;
  lowStockProductsCount: number;
  productsMissingImage: number;
  staleProducts: number;
  revenueTrend: SellerRevenueTrendPoint[];
  ordersDistribution: SellerOrdersDistribution;
  categoryDistribution: SellerCategoryDistributionItem[];
  recentOrders: SellerRecentOrder[];
  topProducts: SellerTopProduct[];
}
