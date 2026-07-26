import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartItem, OrderAddress } from '../../../../core/models/app.models';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { ProductService } from '../../../../core/services/product.service';
import { UiService } from '../../../../shared/services/ui.service';

interface SavedCheckoutAddress extends OrderAddress {
  id: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-checkout',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout implements OnInit, OnDestroy {
  private static readonly ADDRESS_STORAGE_PREFIX = 'checkout-addresses';

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  cartItems: CartItem[] = [];
  savedAddresses: SavedCheckoutAddress[] = [];
  selectedAddressId = '';
  isAddingAddress = false;

  private currentUid: string | null = null;

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    line1: ['', [Validators.required, Validators.minLength(5)]],
    city: ['', [Validators.required, Validators.minLength(2)]],
    state: ['', [Validators.required, Validators.minLength(2)]],
    zip: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  private authSub?: Subscription;
  private cartSub?: Subscription;

  get total(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
  }

  ngOnInit(): void {
    this.authSub = this.authService.authState$.subscribe((user) => {
      this.cartSub?.unsubscribe();
      this.currentUid = user?.uid ?? null;

      if (!user) {
        this.cartItems = [];
        this.savedAddresses = [];
        this.selectedAddressId = '';
        this.isAddingAddress = false;
        this.form.reset();
        this.cdr.markForCheck();
        return;
      }

      this.loadSavedAddresses(user.uid);

      this.cartSub = this.cartService.watchCart(user.uid).subscribe((items) => {
        this.cartItems = items;
        this.cdr.markForCheck();
      });
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.cartSub?.unsubscribe();
  }

  get selectedAddress(): SavedCheckoutAddress | undefined {
    return this.savedAddresses.find((address) => address.id === this.selectedAddressId) ?? this.savedAddresses.find((address) => address.isDefault) ?? this.savedAddresses[0];
  }

  hasError(controlName: 'fullName' | 'phone' | 'line1' | 'city' | 'state' | 'zip', errorName: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(errorName);
  }

  onNumericInput(controlName: 'phone' | 'zip', event: Event): void {
    const input = event.target as HTMLInputElement;
    const maxLength = controlName === 'phone' ? 10 : 6;
    const value = input.value.replace(/\D/g, '').slice(0, maxLength);

    this.form.controls[controlName].setValue(value);
    input.value = value;
  }

  startAddingAddress(): void {
    this.isAddingAddress = true;
    this.form.reset();
    this.cdr.markForCheck();
  }

  cancelAddAddress(): void {
    this.isAddingAddress = false;
    this.form.reset();
    this.cdr.markForCheck();
  }

  selectAddress(addressId: string): void {
    this.selectedAddressId = addressId;
    this.isAddingAddress = false;
    this.cdr.markForCheck();
  }

  async saveAddress(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.ui.toast('Please enter a valid address');
      return;
    }

    if (!this.currentUid) {
      this.ui.toast('Please login again');
      return;
    }

    const values = this.form.getRawValue();
    const address = this.toSavedAddress(values, this.savedAddresses.length === 0);

    if (address.isDefault) {
      this.savedAddresses = this.savedAddresses.map((item) => ({ ...item, isDefault: false }));
      this.selectedAddressId = address.id;
    }

    this.savedAddresses = [...this.savedAddresses, address];
    this.persistAddresses();
    this.isAddingAddress = false;
    this.form.reset();
    this.ui.toast(address.isDefault ? 'Default address saved' : 'Address saved');
    this.cdr.markForCheck();
  }

  async proceed(): Promise<void> {
    if (this.cartItems.length === 0) {
      this.ui.toast('Please add items to your cart');
      return;
    }

    if (this.isAddingAddress && this.form.dirty && this.form.invalid) {
      this.form.markAllAsTouched();
      this.ui.toast('Please complete the address form');
      return;
    }

    if (this.savedAddresses.length === 0) {
      await this.saveAddress();

      if (this.savedAddresses.length === 0) {
        return;
      }
    }

    if (!this.selectedAddress) {
      this.ui.toast('Please select a delivery address');
      return;
    }

    const stockIssue = await this.findStockIssue();
    if (stockIssue) {
      this.ui.toast(stockIssue);
      return;
    }

    const uid = await this.authService.getCurrentUidAsync();
    if (!uid) {
      return;
    }

    const address: OrderAddress = {
      fullName: this.selectedAddress.fullName,
      phone: this.selectedAddress.phone,
      line1: this.selectedAddress.line1,
      city: this.selectedAddress.city,
      state: this.selectedAddress.state,
      zip: this.selectedAddress.zip,
    };
    const sellerIds = Array.from(new Set(this.cartItems.map((item) => item.product.sellerId)));

    this.router.navigate(['/customer/payment'], {
      state: {
        orderDraft: {
          uid,
          items: this.cartItems,
          amount: this.total,
          address,
          sellerIds,
        },
      },
    });
  }

  private async findStockIssue(): Promise<string | null> {
    for (const item of this.cartItems) {
      if (!item.productId) {
        continue;
      }

      const snapshot = await this.productService.getProductSnapshot(item.productId);
      const available = Number(snapshot?.quantity ?? 0);

      if (available <= 0) {
        return `${item.product.name} is out of stock`;
      }

      if (item.quantity > available) {
        return `Only ${available} unit(s) available for ${item.product.name}`;
      }
    }

    return null;
  }

  private loadSavedAddresses(uid: string): void {
    const addresses = this.readAddresses(uid);
    this.savedAddresses = addresses;
    this.selectedAddressId = addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '';
    this.isAddingAddress = addresses.length === 0;
    this.form.reset();
    this.cdr.markForCheck();
  }

  private readAddresses(uid: string): SavedCheckoutAddress[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const storedValue = localStorage.getItem(this.getStorageKey(uid));
    if (!storedValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedValue) as SavedCheckoutAddress[];
      const addresses = parsed.filter((address) => this.isSavedAddress(address));

      if (addresses.length === 0) {
        return [];
      }

      if (!addresses.some((address) => address.isDefault)) {
        addresses[0] = { ...addresses[0], isDefault: true };
        this.persistAddresses(addresses, uid);
      }

      return addresses;
    } catch {
      return [];
    }
  }

  private persistAddresses(addresses = this.savedAddresses, uid = this.currentUid): void {
    if (typeof localStorage === 'undefined' || !uid) {
      return;
    }

    localStorage.setItem(this.getStorageKey(uid), JSON.stringify(addresses));
  }

  private toSavedAddress(
    values: Readonly<{ fullName: string; phone: string; line1: string; city: string; state: string; zip: string }>,
    isDefault: boolean,
  ): SavedCheckoutAddress {
    return {
      id: this.createAddressId(),
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      line1: values.line1.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      zip: values.zip.trim(),
      isDefault,
    };
  }

  private createAddressId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `address-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private getStorageKey(uid: string): string {
    return `${Checkout.ADDRESS_STORAGE_PREFIX}:${uid}`;
  }

  private isSavedAddress(value: unknown): value is SavedCheckoutAddress {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<SavedCheckoutAddress>;
    return Boolean(
      typeof candidate.id === 'string' &&
        typeof candidate.fullName === 'string' &&
        typeof candidate.phone === 'string' &&
        typeof candidate.line1 === 'string' &&
        typeof candidate.city === 'string' &&
        typeof candidate.state === 'string' &&
        typeof candidate.zip === 'string' &&
        typeof candidate.isDefault === 'boolean',
    );
  }
}