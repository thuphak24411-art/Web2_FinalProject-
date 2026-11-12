import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Checkout } from './components/checkout/checkout';
import { OrdersList } from './components/orders-list/orders-list';
import { Cart } from './components/cart/cart';
import { OrderDetail } from './components/order-detail/order-detail';

@NgModule({
  declarations: [Checkout, OrdersList, Cart, OrderDetail],
  imports: [CommonModule, FormsModule, RouterModule],
})
export class OrderModule {}
