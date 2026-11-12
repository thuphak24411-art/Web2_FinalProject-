import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModule } from '../../../../app-module';
import { ProductPost } from './product-post';

describe('ProductPost', () => {
  let component: ProductPost;
  let fixture: ComponentFixture<ProductPost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductPost);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
