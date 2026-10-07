import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { OrdersList } from './orders-list';
import { OrderService } from '../../services/order';

describe('OrdersList', () => {
  let component: OrdersList;
  let fixture: ComponentFixture<OrdersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrdersList],
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [OrderService]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create orders-list component', () => {
    expect(component).toBeTruthy();
  });
});
