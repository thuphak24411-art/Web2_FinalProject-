import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-post',
  standalone: false,
  styleUrl: './product-post.css',
  templateUrl: './product-post.html',
})
export class ProductPost {
  title: string = '';
  cateID: string = 'c1';
  fromPrice: string = '';
  condition: string = 'Mới 95%';
  description: string = '';

  constructor(private router: Router) {}

  onSubmit(): void {
    alert('Đã gửi thông tin đăng bán sản phẩm! Bài đăng sẽ được Admin kiểm duyệt.');
    this.router.navigate(['/mua-hang']);
  }

  cancel(): void {
    this.router.navigate(['/mua-hang']);
  }
}
