import { Order } from '../../../../core/models/app.models';

export type PaymentMethod = 'upi' | 'card' | 'wallet';
export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';
export type CardBrand = 'Visa' | 'Mastercard' | 'Card';
export type UpiApp = 'Google Pay' | 'PhonePe' | 'Paytm';

export interface PaymentDraft extends Omit<Order, 'id' | 'createdAt' | 'status' | 'paymentStatus'> {}

export interface PaymentRequest {
  uid: string;
  method: PaymentMethod;
  amount: number;
  orderDraft: PaymentDraft;
  upiId?: string;
  upiApp?: UpiApp;
  cardBrand?: CardBrand;
  cardholderName?: string;
  cardNumberMasked?: string;
  walletBalance?: number;
  couponCode?: string;
}

export interface PaymentResult {
  success: boolean;
  method: PaymentMethod;
  message: string;
  referenceId: string;
}

export interface PaymentSummary {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export interface CouponDiscount {
  code: string;
  label: string;
  amount: number;
}