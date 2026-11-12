import type { CartItem } from './admin';

export class Cart {
  _id?: string;
  cartID?: string;
  userID: string = '';
  items: CartItem[] = [];
  updatedAt?: string;
}
