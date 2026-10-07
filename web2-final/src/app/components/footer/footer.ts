import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string }>;
}

export interface FooterData {
  columns: FooterColumn[];
  copyright: string;
}

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class FooterComponent implements OnInit {
  email = signal<string>('');
  consent = signal<boolean>(false);
  noteMessage = signal<string>('');

  copyright = signal<string>('© 2026 ECOCycle. Tất cả quyền được bảo lưu.');

  columns = signal<FooterColumn[]>([
    {
      title: 'Về ECOCycle',
      links: [
        { label: 'Câu chuyện thương hiệu', href: '/cau-chuyen' },
        { label: 'Tác động cộng đồng', href: '/tac-dong' },
        { label: 'Tuyển dụng', href: '/tuyen-dung' },
        { label: 'Liên hệ hợp tác', href: '/hop-tac' }
      ]
    },
    {
      title: 'Hỗ trợ khách hàng',
      links: [
        { label: 'Trung tâm trợ giúp', href: '/tro-giup' },
        { label: 'Hướng dẫn mua sắm', href: '/huong-dan-mua-sam' },
        { label: 'Hướng dẫn sửa chữa', href: '/huong-dan-sua-chua' },
        { label: 'Hướng dẫn tái chế', href: '/huong-dan-tai-che' }
      ]
    },
    {
      title: 'Chính sách',
      links: [
        { label: 'Chính sách giao hàng', href: '/chinh-sach-giao-hang' },
        { label: 'Chính sách đổi trả', href: '/chinh-sach-doi-tra' },
        { label: 'Chính sách bảo hành', href: '/chinh-sach-bao-hanh' },
        { label: 'Điều khoản sử dụng', href: '/dieu-khoan' }
      ]
    }
  ]);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadFooterData();
  }

  loadFooterData(): void {
    this.http.get<FooterData>('footer-links.json').subscribe({
      next: (data) => {
        if (data.columns && data.columns.length > 0) {
          this.columns.set(data.columns);
        }
        if (data.copyright) {
          this.copyright.set(data.copyright);
        }
      },
      error: (err) => {
        console.warn('Dùng dữ liệu footer mặc định do không đọc được footer-links.json:', err);
      }
    });
  }

  onSubscribe(event: Event): void {
    event.preventDefault();
    if (!this.email().trim()) {
      return;
    }

    if (!this.consent()) {
      this.noteMessage.set('Vui lòng đồng ý nhận email trước khi đăng ký.');
      return;
    }

    console.log('Đăng ký nhận tin:', this.email().trim());
    this.noteMessage.set('Đã đăng ký! Cảm ơn bạn.');
    this.email.set('');
  }
}
