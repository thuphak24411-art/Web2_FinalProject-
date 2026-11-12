export class NotificationItem {
  _id?: string;
  notificationID: string = '';
  userID: string = 'CM000001';
  type: 'order' | 'seller' | 'repair' | 'recycle' | 'green_coin' | string = 'order';
  title: string = '';
  content: string = '';
  targetID?: string = '';
  isRead: boolean = false;
  createdAt: string = '';
}
