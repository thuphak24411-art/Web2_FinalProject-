import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModule } from '../../../../app-module';
import { Checkout } from './checkout';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create checkout component', () => {
    expect(component).toBeTruthy();
  });
});
