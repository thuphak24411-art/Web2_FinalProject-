import { TestBed } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OrderService } from './order';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(OrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
