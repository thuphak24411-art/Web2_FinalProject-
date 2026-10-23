import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductList } from './modules/marketplace/components/product-list/product-list';
import { ProductDetail } from './modules/marketplace/components/product-detail/product-detail';
import { ProductPost } from './modules/marketplace/components/product-post/product-post';
import { Cart } from './modules/order/components/cart/cart';
import { Checkout } from './modules/order/components/checkout/checkout';
import { OrdersList } from './modules/order/components/orders-list/orders-list';
import { OrderDetail } from './modules/order/components/order-detail/order-detail';
import { Logincomponent } from './modules/auth/logincomponent/logincomponent';
import { Registercomponent } from './modules/auth/registercomponent/registercomponent';
import { ProfileComponent } from './modules/auth/profile/profile';
import { RepairComponent } from './modules/repair/repair.component';
import { AdminRepairComponent } from './modules/admin/components/admin-repair-component/admin-repair.component';
import { ManagementDashboard } from './modules/admin/components/management-dashboard/management-dashboard';
import { AdminDelivery } from './modules/admin/components/admin-delivery/admin-delivery';
import { AdminReports } from './modules/admin/components/admin-reports/admin-reports';
import { AdminPostManagement } from './modules/admin/components/admin-post-management/admin-post-management';
import { AdminAccounts } from './modules/admin/components/admin-accounts/admin-accounts';

const routes: Routes = [
  { path: '', redirectTo: 'mua-hang', pathMatch: 'full' },
  { path: 'mua-hang', component: ProductList },
  { path: 'san-pham/:id', component: ProductDetail },
  { path: 'dang-ban', component: ProductPost },
  { path: 'gio-hang', component: Cart },
  { path: 'thanh-toan', component: Checkout },
  { path: 'don-hang-da-dat', component: OrdersList },
  { path: 'chi-tiet-don-hang/:id', component: OrderDetail },
  { path: 'login', component: Logincomponent },
  { path: 'register', component: Registercomponent },
  { path: 'tai-khoan', component: ProfileComponent },
  { path: 'sua-chua', component: RepairComponent },
  {path: 'admin',component: ManagementDashboard,
    children: [
      { path: '', redirectTo: 'quan-ly-tai-khoan', pathMatch: 'full' },
      { path: 'quan-ly-tai-khoan', component: AdminAccounts },
      { path: 'quan-ly-dang-ban', component: AdminPostManagement},
      { path: 'quan-ly-sua-chua', component: AdminRepairComponent },
      { path: 'quan-ly-van-chuyen', component: AdminDelivery},
      { path: 'bao-cao-he-thong', component: AdminReports},
    ],
  },
  { path: '**', redirectTo: 'mua-hang' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
