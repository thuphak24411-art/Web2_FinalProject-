import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { HeaderComponent } from './components/header/header';
import { FooterComponent } from './components/footer/footer';
import { MarketplaceModule } from './modules/marketplace/marketplace-module';
import { OrderModule } from './modules/order/order-module';

@NgModule({
  declarations: [App, HeaderComponent, FooterComponent],
  imports: [BrowserModule, AppRoutingModule, FormsModule, ReactiveFormsModule, MarketplaceModule, OrderModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient()
  ],
  bootstrap: [App],
})
export class AppModule {}
