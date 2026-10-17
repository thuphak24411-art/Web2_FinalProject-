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
import { AdminRepairComponent } from './modules/admin/admin-repair.component';
import { SpecialistAssessmentFormComponent } from './modules/admin/specialist-assessment-form.component';

@NgModule({
  declarations: [App, HeaderComponent, FooterComponent, Logincomponent, Registercomponent, ProfileComponent, RepairComponent, AdminRepairComponent, SpecialistAssessmentFormComponent],
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
