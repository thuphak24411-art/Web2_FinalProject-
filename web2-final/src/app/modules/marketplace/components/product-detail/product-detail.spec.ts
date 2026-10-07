import { ComponentFixture, TestBed } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProductDetail } from './product-detail';
import { ProductService } from '../../services/product';
import { CartService } from '../../../order/services/cart';
import { ToastService } from '../../../../services/toast';

describe('ProductDetail', () => {
  let component: ProductDetail;
  let fixture: ComponentFixture<ProductDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductDetail],
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [ProductService, CartService, ToastService]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
