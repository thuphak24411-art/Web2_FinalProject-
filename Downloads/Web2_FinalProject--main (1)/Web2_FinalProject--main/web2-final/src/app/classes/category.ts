import { Product } from './product';

export class Category {
  _id?: string;
  CateID: string = '';
  CateName: string = '';
  Products: Product[] = [];
}
