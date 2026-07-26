import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';

import { SellerRoutingModule } from './seller-routing.module';
import { Seller } from './seller.component';
import { Dashboard } from './pages/dashboard/dashboard';
import { ProductForm } from './pages/product-form/product-form';
import { Orders } from './pages/orders/orders';

import { KPICardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { ChartWidgetComponent } from '../../shared/components/chart-widget/chart-widget.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';

@NgModule({
  declarations: [Seller, Dashboard, ProductForm, Orders],
  imports: [
    SharedModule,
    SellerRoutingModule,
    KPICardComponent,
    ChartWidgetComponent,
    AlertComponent,
    FilterBarComponent,
  ],
})
export class SellerModule {}
