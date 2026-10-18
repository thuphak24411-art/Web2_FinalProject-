import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RepairRequest {
  repairOrderID?: string;
  productID?: string;
  deviceName: string;
  deviceType: string;
  issueDescription: string;
  contactPhone: string;
  userEstimatedPriceVnd?: number | null;
  assessment?: DeviceAssessment;
  status?: string;
  aiAssessmentStatus?: string;
  createdAt?: string;
  orderDate?: string;
  aiAssessmentHistory?: AiAssessment[];
  customerID?: string;
  customer?: RepairCustomer;
  specialistAssessment?: SpecialistAssessment;
  saleListingID?: string;
  userChoice?: {
    option: RepairOption;
    note?: string;
    chosenAt: string;
  };
}

export type RepairOption = 'repair' | 'resell';

export interface SpecialistAssessment {
  specialistID: string;
  specialistName?: string;
  summary: string;
  recommendations: Record<RepairOption, string>;
  estimatedPrices: Record<RepairOption, PriceEstimate>;
  createdAt: string;
}

export type SpecialistAssessmentInput = Omit<SpecialistAssessment, 'specialistID' | 'createdAt'>;

export interface RepairCustomer {
  userID: string;
  userName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}

export interface AiRecommendation {
  title: string;
  recommendation: string;
  nextStep: string;
  confidence: string;
}

export interface AiAssessment {
  assessmentID: string;
  repairOrderID: string;
  userID?: string;
  deviceType: string;
  source: 'gemini' | 'cache' | 'fallback';
  fingerprint?: string;
  recommendation: string;
  recommendations: {
    repair: AiRecommendation;
    resell: AiRecommendation;
  };
  summary: string;
  estimatedPrice: string;
  estimatedPriceDetails?: {
    amountVnd: number | null;
    currency: string;
    display: string;
    rationale: string;
  };
  estimatedPrices?: {
    repair: PriceEstimate;
    resell: PriceEstimate;
  };
  status: string;
  error?: string | null;
  createdAt: string;
}

export interface PriceEstimate {
  amountVnd: number | null;
  currency: string;
  display: string;
  rationale: string;
}

export interface ResellListingInput {
  title: string;
  cateID: string;
  priceVnd: number;
  condition: string;
  description: string;
  image?: string;
}

export interface DeviceAssessment {
  brand: string;
  usagePeriod: string;
  appearance: {
    overall: string;
    screen: string;
    casing: string;
    waterDamage: string;
    damageDescription?: string;
  };
  functionality: {
    startup: string;
    mainFunction: string;
    ports: string;
    deviceChecks: Record<string, string>;
    issues: string[];
    otherIssue?: string;
  };
  battery: {
    condition: string;
    maximumCapacity?: number;
    repairHistory: string;
    replacedParts: string[];
    repairDescription?: string;
    needsTechnicalInspection: boolean;
  };
  images: Array<{ area: string; name: string; type: string; size: number; preview: string }>;
  additionalDescription?: string;
}

@Injectable({ providedIn: 'root' })
export class RepairService {
  private readonly apiBaseUrl = 'http://localhost:3000/api';
  private readonly apiUrl = `${this.apiBaseUrl}/repair-requests`;

  constructor(private http: HttpClient) {}

  createRequest(request: RepairRequest): Observable<{ message: string; repairOrder: RepairRequest }> {
    return this.http.post<{ message: string; repairOrder: RepairRequest }>(this.apiUrl, request);
  }

  getMyRequests(): Observable<{ requests: RepairRequest[] }> {
    return this.http.get<{ requests: RepairRequest[] }>(this.apiUrl);
  }

  requestAiAssessment(repairOrderID: string): Observable<{ message: string; status?: string; assessment?: AiAssessment }> {
    return this.http.post<{ message: string; status?: string; assessment?: AiAssessment }>(
      `${this.apiUrl}/${repairOrderID}/ai-assessment`,
      {}
    );
  }

  getAdminRequests(): Observable<{ requests: RepairRequest[] }> {
    return this.http.get<{ requests: RepairRequest[] }>(
      `${this.apiBaseUrl}/admin/repair-requests`
    );
  }

  updateStatus(
    repairOrderID: string,
    status: string
  ): Observable<{ message: string; status: string }> {
    return this.http.put<{ message: string; status: string }>(
      `${this.apiUrl}/${encodeURIComponent(repairOrderID)}/status`,
      { status }
    );
  }

  deleteAdminRequest(repairOrderID: string, reason: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiBaseUrl}/repair-requests/${encodeURIComponent(repairOrderID)}`,
      { body: { reason } }
    );
  }

  submitSpecialistAssessment(
    repairOrderID: string,
    assessment: SpecialistAssessmentInput
  ): Observable<{ message: string; specialistAssessment: SpecialistAssessment; status: string }> {
    return this.http.post<{ message: string; specialistAssessment: SpecialistAssessment; status: string }>(
      `${this.apiUrl}/${encodeURIComponent(repairOrderID)}/specialist-assessment`,
      assessment
    );
  }

  getSpecialistAssessment(
    repairOrderID: string
  ): Observable<{ repairOrderID: string; specialistAssessment: SpecialistAssessment | null; status: string }> {
    return this.http.get<{
      repairOrderID: string;
      specialistAssessment: SpecialistAssessment | null;
      status: string;
    }>(`${this.apiUrl}/${encodeURIComponent(repairOrderID)}/specialist-assessment`);
  }

  chooseRepairOption(
    repairOrderID: string,
    option: RepairOption
  ): Observable<{ message: string; status: string; userChoice: RepairRequest['userChoice'] }> {
    return this.http.post<{ message: string; status: string; userChoice: RepairRequest['userChoice'] }>(
      `${this.apiUrl}/${encodeURIComponent(repairOrderID)}/choice`,
      { option }
    );
  }

  createResellListing(
    repairOrderID: string,
    listing: ResellListingInput
  ): Observable<{ message: string; productID: string; status: string; userChoice: RepairRequest['userChoice'] }> {
    return this.http.post<{ message: string; productID: string; status: string; userChoice: RepairRequest['userChoice'] }>(
      `${this.apiUrl}/${encodeURIComponent(repairOrderID)}/resell-listing`,
      listing
    );
  }
}
