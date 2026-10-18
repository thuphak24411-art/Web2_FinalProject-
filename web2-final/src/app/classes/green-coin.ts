export class GreenCoinTransaction {
  _id?: string;
  transactionID: string = '';
  orderID?: string;
  orderType?: string;
  userInfo?: {
    userID: string;
    fullName: string;
    userRole: string;
  };
  productName?: string;
  action: string = '';
  greenCoins: number = 0;
  transactionDate: string = '';
}
