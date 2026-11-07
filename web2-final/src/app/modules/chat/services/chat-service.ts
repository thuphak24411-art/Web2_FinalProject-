
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../../../services/auth.service';

export interface ChatConversation {
  _id: string;
  participants: string[];
  productID: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  conversationID: string;
  senderID: string;
  content: string;
  createdAt: string;
  isRead: boolean;
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

  getMessages(conversationID: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${this.apiUrl}/conversations/${conversationID}/messages`
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
    this.socket?.emit(
      'chat:send',
      { conversationID, content },
      callback
    );
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.socket?.on('chat:message', callback);
  }

  offMessage(callback: (message: ChatMessage) => void): void {
    this.socket?.off('chat:message', callback);
  }
}
