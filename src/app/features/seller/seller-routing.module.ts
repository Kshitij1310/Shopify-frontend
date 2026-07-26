import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { Seller } from './seller.component';
import { Dashboard } from './pages/dashboard/dashboard';
import { Orders } from './pages/orders/orders';
import { ProductForm } from './pages/product-form/product-form';

const routes: Routes = [
  {
    path: '',
    component: Seller,
    canActivate: [authGuard, roleGuard],
    data: { role: 'partner' },
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'products/new', component: ProductForm },
      { path: 'products/:id/edit', component: ProductForm },
      { path: 'orders', component: Orders },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SellerRoutingModule {}
