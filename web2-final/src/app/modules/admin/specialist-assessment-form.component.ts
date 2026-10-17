import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SpecialistAssessmentInput } from '../repair/repair.service';

@Component({
  selector: 'app-specialist-assessment-form',
  standalone: false,
  templateUrl: './specialist-assessment-form.component.html',
  styleUrl: './specialist-assessment-form.component.css'
})
export class SpecialistAssessmentFormComponent {
  private readonly requiredOptions = ['repair', 'resell'] as const;

  @Input() submitting = false;
  @Input() errorMessage = '';
  @Output() assessmentSubmit = new EventEmitter<SpecialistAssessmentInput>();

  summary = '';
  recommendations: Record<'repair' | 'resell', string> = { repair: '', resell: '' };
  prices = {
    repair: { amountVnd: null as number | null, rationale: '' },
    resell: { amountVnd: null as number | null, rationale: '' }
  };
  validationError = '';

  submitAssessment(): void {
    const summary = this.summary.trim();
    const recommendations = {
      repair: this.recommendations.repair.trim(),
      resell: this.recommendations.resell.trim()
    };
    if (this.submitting) {
      return;
    }
    if (summary.length < 10) {
      this.validationError = 'Nhận xét tổng quan cần dài ít nhất 10 ký tự.';
      return;
    }
    if (summary.length > 3000) {
      this.validationError = 'Nhận xét tổng quan không được vượt quá 3000 ký tự.';
      return;
    }
    if (this.requiredOptions.some(option => !recommendations[option])) {
      this.validationError = 'Vui lòng nhập nhận định cho cả hai phương án: Sửa chữa và Bán lại.';
      return;
    }
    if (this.requiredOptions.some(option => recommendations[option].length > 3000)) {
      this.validationError = 'Nhận định cho mỗi phương án không được vượt quá 3000 ký tự.';
      return;
    }
    if (this.requiredOptions.some(option => this.prices[option].rationale.trim().length > 1000)) {
      this.validationError = 'Cơ sở báo giá không được vượt quá 1000 ký tự.';
      return;
    }
    if (![this.prices.repair.amountVnd, this.prices.resell.amountVnd].every(amount =>
      amount === null || (Number.isInteger(amount) && amount >= 0 && amount <= 1_000_000_000)
    )) {
      this.validationError = 'Chi phí tham khảo phải là số nguyên từ 0 đến 1.000.000.000 VNĐ.';
      return;
    }
    this.validationError = '';

    this.assessmentSubmit.emit({
      summary,
      recommendations,
      estimatedPrices: {
        repair: this.createPrice(this.prices.repair),
        resell: this.createPrice(this.prices.resell)
      }
    });
  }

  private createPrice(price: { amountVnd: number | null; rationale: string }): SpecialistAssessmentInput['estimatedPrices']['repair'] {
    return {
      ...price,
      currency: 'VND',
      display: '',
      rationale: price.rationale.trim()
    };
  }
}
