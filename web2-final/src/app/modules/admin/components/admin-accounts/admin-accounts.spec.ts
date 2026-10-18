import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminAccounts } from './admin-accounts';
import { AdminGreencoinUpdate } from '../admin-greencoin-update/admin-greencoin-update';
import { AdminService } from '../../services/admin.services';
import { of } from 'rxjs';

describe('AdminAccounts', () => {
  let component: AdminAccounts;
  let fixture: ComponentFixture<AdminAccounts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminAccounts, AdminGreencoinUpdate],
      imports: [CommonModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: AdminService,
          useValue: {
            getUsers: () => of({ users: [] }),
            addGreenCoins: () => of({ user: {}, amount: 0 })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAccounts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
