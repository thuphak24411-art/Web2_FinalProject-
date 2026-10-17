import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModule } from '../../../../app-module';
import { OrdersList } from './orders-list';

describe('OrdersList', () => {
  let component: OrdersList;
  let fixture: ComponentFixture<OrdersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create orders-list component', () => {
    expect(component).toBeTruthy();
  });
});
