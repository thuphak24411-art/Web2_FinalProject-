import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModule } from '../../app-module';
import { SpecialistAssessmentFormComponent } from './specialist-assessment-form.component';

describe('SpecialistAssessmentFormComponent', () => {
  let component: SpecialistAssessmentFormComponent;
  let fixture: ComponentFixture<SpecialistAssessmentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SpecialistAssessmentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('submits only the repair and resell recommendations', () => {
    const submitted: unknown[] = [];
    component.assessmentSubmit.subscribe(value => submitted.push(value));
    component.summary = 'Kiểm tra đầy đủ tình trạng thiết bị.';
    component.recommendations.repair = 'Thay cổng sạc bị hỏng.';
    component.recommendations.resell = 'Có thể đăng bán sau khi công khai lỗi.';

    component.submitAssessment();

    expect(submitted).toHaveLength(1);
    const result = submitted[0] as { recommendations: Record<string, string> };
    expect(result.recommendations).toEqual({
      repair: 'Thay cổng sạc bị hỏng.',
      resell: 'Có thể đăng bán sau khi công khai lỗi.'
    });
    expect(Object.keys(result.recommendations)).toEqual([
      'repair',
      'resell'
    ]);
  });

  it('does not submit unless both displayed recommendations are provided', () => {
    let submitCount = 0;
    component.assessmentSubmit.subscribe(() => submitCount++);
    component.summary = 'Kiểm tra đầy đủ tình trạng thiết bị.';
    component.recommendations.repair = 'Thay cổng sạc bị hỏng.';

    component.submitAssessment();

    expect(submitCount).toBe(0);
    expect(component.validationError).toContain('Sửa chữa và Bán lại');
  });

  it('does not submit an invalid optional price', () => {
    let submitCount = 0;
    component.assessmentSubmit.subscribe(() => submitCount++);
    component.summary = 'Kiểm tra đầy đủ tình trạng thiết bị.';
    component.recommendations.repair = 'Thay cổng sạc bị hỏng.';
    component.recommendations.resell = 'Có thể đăng bán sau khi công khai lỗi.';
    component.prices.repair.amountVnd = 1_000_000_001;

    component.submitAssessment();

    expect(submitCount).toBe(0);
    expect(component.validationError).toContain('Chi phí tham khảo');
  });

  it('requires optional VND prices to be whole numbers', () => {
    let submitCount = 0;
    component.assessmentSubmit.subscribe(() => submitCount++);
    component.summary = 'Kiểm tra đầy đủ tình trạng thiết bị.';
    component.recommendations.repair = 'Thay cổng sạc bị hỏng.';
    component.recommendations.resell = 'Có thể đăng bán sau khi công khai lỗi.';
    component.prices.resell.amountVnd = 1250.5;

    component.submitAssessment();

    expect(submitCount).toBe(0);
    expect(component.validationError).toContain('số nguyên');
  });
});
