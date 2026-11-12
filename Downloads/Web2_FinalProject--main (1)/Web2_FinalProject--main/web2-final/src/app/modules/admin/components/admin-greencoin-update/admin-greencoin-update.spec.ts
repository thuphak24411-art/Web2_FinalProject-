import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminGreencoinUpdate } from './admin-greencoin-update';
import { AdminService } from '../../services/admin.services';
import { of } from 'rxjs';

describe('AdminGreencoinUpdate', () => {
  let component: AdminGreencoinUpdate;
  let fixture: ComponentFixture<AdminGreencoinUpdate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminGreencoinUpdate],
      providers: [
        { provide: AdminService, useValue: { addGreenCoins: () => of({ user: {}, amount: 1 }) } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGreencoinUpdate);
    component = fixture.componentInstance;
    component.user = {};
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
