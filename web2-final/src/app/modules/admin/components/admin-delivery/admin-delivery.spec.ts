import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDelivery } from './admin-delivery';

describe('AdminDelivery', () => {
  let component: AdminDelivery;
  let fixture: ComponentFixture<AdminDelivery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminDelivery],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDelivery);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
