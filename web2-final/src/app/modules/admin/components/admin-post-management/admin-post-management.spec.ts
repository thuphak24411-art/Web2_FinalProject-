import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPostManagement } from './admin-post-management';
import { AdminService } from '../../services/admin.services';
import { of } from 'rxjs';

describe('AdminPostManagement', () => {
  let component: AdminPostManagement;
  let fixture: ComponentFixture<AdminPostManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminPostManagement],
      providers: [
        { provide: AdminService, useValue: { getSellOrders: () => of({ orders: [] }) } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPostManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
