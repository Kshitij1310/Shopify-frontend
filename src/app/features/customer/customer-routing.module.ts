import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { Customer } from './customer.component';
import { Cart } from './pages/cart/cart';
import { Checkout } from './pages/checkout/checkout';
import { HomePageComponent } from './pages/home/home';
import { OrderHistory } from './pages/order-history/order-history';
import { Payment } from './pages/payment/payment';
import { CustomerProfilePageComponent } from './pages/profile/profile';
import { ProductDetail } from './pages/product-detail/product-detail';
import { ProductsPageComponent } from './pages/products/products';
import { Wishlist } from './pages/wishlist/wishlist';

const routes: Routes = [
  {
    path: '',
    component: Customer,
    canActivate: [authGuard, roleGuard],
    data: { role: 'customer' },
    children: [
      { path: 'home', component: HomePageComponent },
      { path: 'products', component: ProductsPageComponent },
      { path: 'profile', component: CustomerProfilePageComponent },
      { path: 'products/:id', component: ProductDetail },
      { path: 'cart', component: Cart },
      { path: 'wishlist', component: Wishlist },
      { path: 'checkout', component: Checkout },
      { path: 'payment', component: Payment },
      { path: 'orders', component: OrderHistory },
      { path: '', pathMatch: 'full', redirectTo: 'home' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerRoutingModule {}
