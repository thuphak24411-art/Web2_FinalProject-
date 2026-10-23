import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { MarketplaceModule } from './modules/marketplace/marketplace-module';
import { OrderModule } from './modules/order/order-module';
import { Logincomponent } from './modules/auth/logincomponent/logincomponent';
import { authInterceptor } from './services/auth.interceptor';
import { Registercomponent } from './modules/auth/registercomponent/registercomponent';
import { ProfileComponent } from './modules/auth/profile/profile';
import { RepairComponent } from './modules/repair/repair.component';
import { AdminRepairComponent } from './modules/admin/components/admin-repair-component/admin-repair.component';
import { ManagementDashboard } from './modules/admin/components/management-dashboard/management-dashboard';
import { AdminDelivery } from './modules/admin/components/admin-delivery/admin-delivery';
import { AdminReports } from './modules/admin/components/admin-reports/admin-reports';
import { AdminPostManagement } from './modules/admin/components/admin-post-management/admin-post-management';
import { AdminAccounts } from './modules/admin/components/admin-accounts/admin-accounts';
import { AdminGreencoinUpdate } from './modules/admin/components/admin-greencoin-update/admin-greencoin-update';

@NgModule({
  declarations: [
    App,
    HeaderComponent,
    FooterComponent,
    Logincomponent,
    Registercomponent,
    ProfileComponent,
    RepairComponent,
    AdminRepairComponent,
    ManagementDashboard,
    AdminDelivery,
    AdminReports,
    AdminPostManagement,
    AdminAccounts,
    AdminGreencoinUpdate,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MarketplaceModule,
    OrderModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [App],
})
export class AppModule {}
