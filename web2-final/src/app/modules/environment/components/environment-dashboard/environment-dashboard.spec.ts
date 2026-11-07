import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvironmentDashboard } from './environment-dashboard';

describe('EvironmentDashboard', () => {
  let component: EvironmentDashboard;
  let fixture: ComponentFixture<EvironmentDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EvironmentDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(EvironmentDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
