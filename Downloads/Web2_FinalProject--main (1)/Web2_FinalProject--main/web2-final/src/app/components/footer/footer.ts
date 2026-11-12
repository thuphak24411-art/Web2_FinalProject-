import { Component, signal } from '@angular/core';
import type { FooterColumn } from '../../classes/admin';

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class FooterComponent {
  // Nội dung tĩnh: không cần signal vì không thay đổi trong quá trình sử dụng.
  readonly copyright = `© ${new Date().getFullYear()} ECOCycle. Tất cả quyền được bảo lưu.`;

  readonly columns: FooterColumn[] = [
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
  ];

  // Trạng thái biểu mẫu đăng ký nhận tin.
  readonly email = signal('');
  readonly consent = signal(false);
  readonly noteMessage = signal('');

  onSubscribe(event: Event): void {
    event.preventDefault();

    const email = this.email().trim();
    if (!email) {
      this.noteMessage.set('Vui lòng nhập địa chỉ email.');
      return;
    }

    if (!this.consent()) {
      this.noteMessage.set('Vui lòng đồng ý nhận email trước khi đăng ký.');
      return;
    }

    // TODO: Kết nối API đăng ký nhận tin trước khi thông báo thành công.
    this.noteMessage.set('Chức năng đăng ký nhận tin đang được hoàn thiện.');
  }
}
