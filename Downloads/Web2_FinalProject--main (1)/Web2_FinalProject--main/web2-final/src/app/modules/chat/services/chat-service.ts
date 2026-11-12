
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../../../services/auth.service';

export interface ChatConversation {
  _id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string>;
  productID: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
  type?: 'product' | 'support';
}

export interface ChatMessage {
  _id: string;
  conversationID: string;
  senderID: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  imageUrl?: string;
  type?: 'text' | 'image' | 'system';
}

export interface ChatAck {
  ok: boolean;
  message?: string | ChatMessage;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = 'http://localhost:3000/api/chat';
  private readonly socketUrl = 'http://localhost:3000';

  private socket: Socket | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  connect(): void {
    const token = this.authService.token;
    if (!token) return;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);
    });

    this.socket.on('connect_error', error => {
      console.error('Socket.IO error:', error.message);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getConversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(
      `${this.apiUrl}/conversations`
    );
  }

  createConversation(
    receiverID: string,
    productID = ''
  ): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(
      `${this.apiUrl}/conversations`,
      { receiverID, productID }
    );
  }
  // Tạo hoặc mở cuộc trò chuyện hỗ trợ Admin
  createSupportConversation() {
    return this.http.post<ChatConversation>(
      `${this.apiUrl}/support`,
      {}
    );
  }

  sendSupportTopic(conversationID: string, topicID: string) {
    return this.http.post(
      `${this.apiUrl}/support/${conversationID}/topic`,
      { topicID }
    );
  }

  getMessages(conversationID: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${this.apiUrl}/conversations/${conversationID}/messages`
    );
  }
  uploadImage(
    conversationID: string,
    file: File
  ): Observable<ChatMessage> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ChatMessage>(
      `${this.apiUrl}/conversations/${conversationID}/images`,
      formData
    );
  }

  getChatImage(imageUrl: string): Observable<Blob> {
    return this.http.get(
      `http://localhost:3000${imageUrl}`,
      { responseType: 'blob' }
    );
  }

  joinConversation(
    conversationID: string,
    callback?: (result: ChatAck) => void
  ): void {
    this.socket?.emit('chat:join', conversationID, callback);
  }

  sendMessage(
    conversationID: string,
    content: string,
    callback?: (result: ChatAck) => void
  ): void {
    if (!this.socket?.connected) {
      callback?.({
        ok: false,
        message: 'Mất kết nối Chat. Vui lòng tải lại trang.'
      });
      return;
    }

    this.socket.timeout(10000).emit(
      'chat:send',
      { conversationID, content },
      (error: Error | null, result: ChatAck) => {
        if (error) {
          callback?.({
            ok: false,
            message: 'Server không phản hồi trong 10 giây.'
          });
          return;
        }

        callback?.(result);
      }
    );
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.socket?.on('chat:message', callback);
  }

  offMessage(callback: (message: ChatMessage) => void): void {
    this.socket?.off('chat:message', callback);
  }
}
