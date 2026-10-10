import { User } from './user';

export class Product {
  id: string = '';
  img: string = '';
  title: string = '';
  quantity: number = 0;
  fromPrice: string = '';
  newPrice: string = '';
  saving: string = '';
  discount: string = '';
  sellerid: string = '';
  condition: string = '';
  Status: string = '';
  Description: string = '';
  sellerInfo?: User;
  sellerLocation?: string;
}
