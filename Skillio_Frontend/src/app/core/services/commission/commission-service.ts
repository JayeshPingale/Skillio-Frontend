import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
export interface CommissionDTO {
  commissionId: number;
  enrollmentId: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  courseName: string;
  salesExecutiveId: number;
  salesExecutiveName: string;
  totalCourseFees: number;
  commissionPercentage: number;
  eligibleAmount: number;
  status: string; // PENDING | PENDING_APPROVAL | APPROVED | ELIGIBLE | PAID | REJECTED
  eligibilityCondition: string;
  eligibilityDate: string;
  paidDate: string;
  remarks: string;
  requestedRemarks: string;
  adminComments: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommissionRequest {
  enrollmentId: number;
  salesExecutiveId: number;
  totalCourseFees: number;
  commissionPercentage: number;
  remarks: string;
}

export interface UpdateCommissionRequest {
  totalCourseFees?: number;
  commissionPercentage?: number;
  remarks?: string;
}

export interface ApproveCommissionRequest {
  commissionId: number;
  approved: boolean;
  comments?: string;
  amountPaid?: number;
  paymentMode?: string;
  transactionId?: string;
}

export interface EnrolledStudentCommissionView {
  enrollmentId: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  courseName: string;
  enrollmentDate: string;
  totalCourseFee: number;
  totalFeesPaid: number;
  totalFeesPending: number;
  commissionId?: number;
  commissionStatus?: string;
  eligibleAmount?: number;
  requestedRemarks?: string;
  adminComments?: string;
}

@Injectable({ providedIn: 'root' })
export class CommissionService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/commissions`;

  // ========== ADMIN ==========
  getAllCommissions(): Observable<CommissionDTO[]> {
    return this.http.get<CommissionDTO[]>(this.apiUrl);
  }

  getCommissionById(id: number): Observable<CommissionDTO> {
    return this.http.get<CommissionDTO>(`${this.apiUrl}/${id}`);
  }

  createCommission(request: CreateCommissionRequest): Observable<CommissionDTO> {
    return this.http.post<CommissionDTO>(this.apiUrl, request);
  }

  updateCommission(id: number, request: UpdateCommissionRequest): Observable<CommissionDTO> {
    return this.http.put<CommissionDTO>(`${this.apiUrl}/${id}`, request);
  }

  approveOrRejectCommission(request: ApproveCommissionRequest): Observable<CommissionDTO> {
    return this.http.post<CommissionDTO>(`${this.apiUrl}/approve`, request);
  }

  markAsEligible(id: number): Observable<CommissionDTO> {
    return this.http.patch<CommissionDTO>(`${this.apiUrl}/${id}/mark-eligible`, {});
  }

  markAsPaid(id: number): Observable<CommissionDTO> {
    return this.http.patch<CommissionDTO>(`${this.apiUrl}/${id}/mark-paid`, {});
  }

  deleteCommission(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getCommissionsByStatus(status: string): Observable<CommissionDTO[]> {
    return this.http.get<CommissionDTO[]>(`${this.apiUrl}/status/${status}`);
  }

  getPendingApprovalCommissions(): Observable<CommissionDTO[]> {
    return this.http.get<CommissionDTO[]>(`${this.apiUrl}/pending-approval`);
  }

  getCommissionsBySalesExecutive(id: number): Observable<CommissionDTO[]> {
    return this.http.get<CommissionDTO[]>(`${this.apiUrl}/sales-executive/${id}`);
  }

  getCommissionsBySalesExecutiveAndStatus(id: number, status: string): Observable<CommissionDTO[]> {
    return this.http.get<CommissionDTO[]>(`${this.apiUrl}/sales-executive/${id}/status/${status}`);
  }

  getCommissionsByEnrollment(enrollmentId: number): Observable<CommissionDTO[]> {
    return this.http.get<CommissionDTO[]>(`${this.apiUrl}/enrollment/${enrollmentId}`);
  }

  // ========== ANALYTICS ==========
  getTotalEligibleAmount(salesExecutiveId: number): Observable<{ totalEligibleAmount: number }> {
    return this.http.get<{ totalEligibleAmount: number }>(
      `${this.apiUrl}/sales-executive/${salesExecutiveId}/total-eligible`
    );
  }

  getTotalPaidCommission(salesExecutiveId: number): Observable<{ totalPaidCommission: number }> {
    return this.http.get<{ totalPaidCommission: number }>(
      `${this.apiUrl}/sales-executive/${salesExecutiveId}/total-paid`
    );
  }

  getCommissionCount(salesExecutiveId: number, status: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(
      `${this.apiUrl}/sales-executive/${salesExecutiveId}/count/${status}`
    );
  }

  // ========== SALES EXECUTIVE ==========
  requestCommission(request: CreateCommissionRequest): Observable<CommissionDTO> {
    return this.http.post<CommissionDTO>(`${this.apiUrl}/request`, request);
  }

  getMyCommissions(): Observable<CommissionDTO[]> {
    return this.http.get<CommissionDTO[]>(`${this.apiUrl}/my-commissions`);
  }

  getMyEnrolledStudents(): Observable<EnrolledStudentCommissionView[]> {
    return this.http.get<EnrolledStudentCommissionView[]>(`${this.apiUrl}/my-enrolled-students`);
  }
}
