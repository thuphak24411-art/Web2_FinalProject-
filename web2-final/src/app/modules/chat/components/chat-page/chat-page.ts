import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ActivatedRoute
} from '@angular/core';

import {
  ChatService,
  ChatConversation,
  ChatMessage
} from '../../services/chat-service';

import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-chat-page',
  standalone: false,
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css'
})
export class ChatPageComponent implements OnInit, OnDestroy {
  conversations: ChatConversation[] = [];
  messages: ChatMessage[] = [];

  selectedConversation: ChatConversation | null = null;
  messageInput = '';

  loading = false;
  sending = false;
  errorMessage = '';

  private readonly messageHandler = (message: ChatMessage) => {
    if (message.conversationID === this.selectedConversation?._id) {
      if (!this.messages.some(item => item._id === message._id)) {
        this.messages = [...this.messages, message];
      }
    }

    this.loadConversations();
    this.cdr.detectChanges();
  };

  constructor(
    private chatService: ChatService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (!this.authService.token) {
      this.errorMessage = 'Vui lòng đăng nhập để sử dụng tin nhắn.';
      return;
    }

    this.chatService.connect();
    this.chatService.onMessage(this.messageHandler);
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.chatService.offMessage(this.messageHandler);
    this.chatService.disconnect();
  }

  loadConversations(): void {
    this.loading = true;

    this.chatService.getConversations().subscribe({
      next: data => {
        this.conversations = data;
        this.loading = false;

        const conversationID =
          this.route.snapshot.queryParamMap.get('conversationID');

        if (conversationID) {
          const conversation = data.find(
            item => item._id === conversationID
          );

          if (conversation) {
            this.selectConversation(conversation);
          }
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Không thể tải danh sách cuộc trò chuyện.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectConversation(conversation: ChatConversation): void {
    this.selectedConversation = conversation;
    this.messages = [];
    this.errorMessage = '';

    this.chatService.joinConversation(conversation._id, result => {
      if (!result.ok) {
        this.errorMessage = 'Không thể tham gia cuộc trò chuyện.';
        this.cdr.detectChanges();
      }
    });

    this.chatService.getMessages(conversation._id).subscribe({
      next: data => {
        if (this.selectedConversation?._id === conversation._id) {
          const existingIds = new Set(data.map(item => item._id));
          const newerMessages = this.messages.filter(
            item => !existingIds.has(item._id)
          );

          this.messages = [...data, ...newerMessages];
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.errorMessage = 'Không thể tải lịch sử tin nhắn.';
        this.cdr.detectChanges();
      }
    });
  }

  sendMessage(): void {
    const content = this.messageInput.trim();
    const conversationID = this.selectedConversation?._id;

    if (!content || !conversationID || this.sending) return;

    this.sending = true;

    this.chatService.sendMessage(conversationID, content, result => {
      this.sending = false;

      if (result.ok) {
        this.messageInput = '';
      } else {
        this.errorMessage = typeof result.message === 'string'
          ? result.message
          : 'Gửi tin nhắn thất bại.';
      }

      this.cdr.detectChanges();
    });
  }

  getOtherUserID(conversation: ChatConversation): string {
    const myID = String(
      (this.authService.currentUser as any)?.userID || ''
    );

    return conversation.participants.find(
      id => id !== myID
    ) || 'Người dùng';
  }

  isMyMessage(message: ChatMessage): boolean {
    const myID = String(
      (this.authService.currentUser as any)?.userID || ''
    );

    return String(message.senderID) === myID;
  }
  conversationSearch = '';

get filteredConversations() {
  const keyword = this.conversationSearch.trim().toLowerCase();

  if (!keyword) {
    return this.conversations;
  }

  return this.conversations.filter(conversation => {
    const userID = String(this.getOtherUserID(conversation)).toLowerCase();
    const lastMessage = String(conversation.lastMessage ?? '').toLowerCase();

    return userID.includes(keyword) || lastMessage.includes(keyword);
  });
}
}
