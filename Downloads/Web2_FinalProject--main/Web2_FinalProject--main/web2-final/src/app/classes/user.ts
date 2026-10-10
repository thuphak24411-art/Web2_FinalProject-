export interface BankInfo {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export interface CustomerDetails {
  address?: string;
  province?: string;
  district?: string;
  streetAddress?: string;
  bankInfo?: BankInfo;
}

export interface SellerDetails {
  address?: string;
  province?: string;
  district?: string;
  streetAddress?: string;
  businessName?: string;
  shopName?: string;
  taxCode?: string;
  bankInfo?: BankInfo;
}

export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'TECHNICIAN';

export class User {
  _id?: string;
  userID?: string = '';
  userName?: string = '';
  fullName?: string = '';
  email?: string = '';
  phoneNumber?: string = '';
  password?: string;
  role?: UserRole = 'CUSTOMER';
  status?: 'ACTIVE' | 'INACTIVE' | string = 'ACTIVE';
  greenCoins?: number = 0;
  eWasteRecycledKg?: number = 0;
  joinDate?: string = '';
  customerDetails?: CustomerDetails;
  sellerDetails?: SellerDetails;
  avatar?: string = '';

  id?: string = '';
  name?: string = '';
  address?: string = '';
  soldCount?: number = 0;
  rating?: number = 5.0;
  phone?: string = '';
  isVerified?: boolean = true;
}
