import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RepairService, SpecialistAssessmentInput } from './repair.service';

describe('RepairService specialist assessment API', () => {
  let service: RepairService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RepairService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(RepairService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('retrieves the saved specialist assessment with GET', () => {
    let result: unknown;
    service.getSpecialistAssessment('RP123').subscribe(response => result = response);

    const request = http.expectOne(
      'http://localhost:3000/api/repair-requests/RP123/specialist-assessment'
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      repairOrderID: 'RP123',
      specialistAssessment: null,
      status: 'Chờ chuyên gia đánh giá'
    });
    expect(result).toEqual({
      repairOrderID: 'RP123',
      specialistAssessment: null,
      status: 'Chờ chuyên gia đánh giá'
    });
  });

  it('submits the two-option assessment with POST to the same resource', () => {
    const assessment: SpecialistAssessmentInput = {
      summary: 'Thiết bị đã được kiểm tra thực tế.',
      recommendations: {
        repair: 'Thay cổng sạc bị hỏng.',
        resell: 'Có thể bán lại sau khi công khai lỗi.'
      },
      estimatedPrices: {
        repair: { amountVnd: 150000, currency: 'VND', display: '', rationale: 'Thay linh kiện.' },
        resell: { amountVnd: 500000, currency: 'VND', display: '', rationale: 'Tham khảo thị trường.' }
      }
    };
    let result: unknown;
    service.submitSpecialistAssessment('RP123', assessment).subscribe(response => result = response);

    const request = http.expectOne(
      'http://localhost:3000/api/repair-requests/RP123/specialist-assessment'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(assessment);
    request.flush({
      message: 'Đã lưu đánh giá.',
      specialistAssessment: { ...assessment, specialistID: 'TECH1', createdAt: '2026-10-10T00:00:00.000Z' },
      status: 'Chờ lựa chọn của người dùng'
    });
    expect(result).toMatchObject({ status: 'Chờ lựa chọn của người dùng' });
  });
});
