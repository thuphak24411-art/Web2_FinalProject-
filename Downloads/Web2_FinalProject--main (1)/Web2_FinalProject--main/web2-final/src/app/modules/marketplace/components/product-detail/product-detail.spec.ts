import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModule } from '../../../../app-module';
import { ProductDetail } from './product-detail';

describe('ProductDetail', () => {
  let component: ProductDetail;
  let fixture: ComponentFixture<ProductDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
