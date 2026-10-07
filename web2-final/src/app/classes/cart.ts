export interface CartItem {
  id: string;
  title: string;
  img: string;
  price: number;
  quantity: number;
  condition?: string;
  sellerid?: string;
  sellerLocation?: string;
}

export class Cart {
  _id?: string;
  cartID?: string;
  userID: string = '';
  items: CartItem[] = [];
  updatedAt?: string;
}
