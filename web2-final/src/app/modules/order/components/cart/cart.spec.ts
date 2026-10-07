import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Cart } from './cart';
import { CartService } from '../../services/cart';
import { ToastService } from '../../../../services/toast';

describe('Cart', () => {
  let component: Cart;
  let fixture: ComponentFixture<Cart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Cart],
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [CartService, ToastService]
    }).compileComponents();

    fixture = TestBed.createComponent(Cart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create cart component', () => {
    expect(component).toBeTruthy();
  });
});
