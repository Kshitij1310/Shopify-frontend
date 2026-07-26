import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authMatchGuard, guestGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'auth',
    canMatch: [guestGuard],
    loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'customer',
    canMatch: [authMatchGuard],
    loadChildren: () => import('./features/customer/customer.module').then((m) => m.CustomerModule),
  },
  {
    path: 'seller',
    canMatch: [authMatchGuard],
    loadChildren: () => import('./features/seller/seller.module').then((m) => m.SellerModule),
  },
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  { path: '**', redirectTo: 'auth/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
