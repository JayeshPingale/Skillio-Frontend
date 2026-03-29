  import { Injectable, inject } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable } from 'rxjs';
  import { environment } from '../../../environments/environment.development';

  // ✅ Export all interfaces
  export interface StudentFeesResponse {
    feesId: number;
    enrollmentId: number;
    studentId: number;
    studentName: string;
    studentEmail: string;

    courseId: number;
    courseName: string;

    batchId: number;
    batchName: string;

    totalFees: number;
    paidAmount: number;
    balanceAmount: number;

    discountAmount: number; // ✅ ADD THIS
    discountReason: string; // ✅ ADD THIS
    paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
    dueDate: string;
    lastPaymentDate: string | null;
    remarks: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface CreateStudentFeesRequest {
    enrollmentId: number;
    totalFees: number;
    amountPaid: number;
    paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
    dueDate: string;
    remarks: string;
  }

  export interface UpdateStudentFeesRequest {
    totalFees: number;
    paidAmount: number;
    paymentStatus: 'PENDING' | 'PARTIAL' | 'COMPLETED';
    dueDate: string;
    remarks: string;
  }

  export interface StudentFeesStats {
    total: number;
    pending: number;
    partial: number;
    completed: number;
    totalFeesAmount: number;
    totalPaidAmount: number;
    balanceAmount: number;
  }

  @Injectable({
    providedIn: 'root',
  })
  export class StudentFeesService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/student-fees`;

    // Get all student fees
    getAllStudentFees(): Observable<StudentFeesResponse[]> {
      return this.http.get<StudentFeesResponse[]>(this.apiUrl);
    }

    // Get student fees by ID
    getStudentFeesById(feesId: number): Observable<StudentFeesResponse> {
      return this.http.get<StudentFeesResponse>(`${this.apiUrl}/${feesId}`);
    }

    // Get fees by enrollment
    getFeesByEnrollment(enrollmentId: number): Observable<StudentFeesResponse[]> {
      return this.http.get<StudentFeesResponse[]>(`${this.apiUrl}/enrollment/${enrollmentId}`);
    }

    // Get fees by student
    getFeesByStudent(studentId: number): Observable<StudentFeesResponse[]> {
      return this.http.get<StudentFeesResponse[]>(`${this.apiUrl}/student/${studentId}`);
    }

    // Get fees by batch
    getFeesByBatch(batchId: number): Observable<StudentFeesResponse[]> {
      return this.http.get<StudentFeesResponse[]>(`${this.apiUrl}/batch/${batchId}`);
    }

    // Get fees by payment status
    getFeesByPaymentStatus(status: string): Observable<StudentFeesResponse[]> {
      return this.http.get<StudentFeesResponse[]>(`${this.apiUrl}/payment-status/${status}`);
    }

    // Get overdue fees
    getOverdueFees(): Observable<StudentFeesResponse[]> {
      return this.http.get<StudentFeesResponse[]>(`${this.apiUrl}/overdue`);
    }

    // Create student fees
    createStudentFees(request: CreateStudentFeesRequest): Observable<StudentFeesResponse> {
      return this.http.post<StudentFeesResponse>(this.apiUrl, request);
    }

    getMyStudentFees(): Observable<StudentFeesResponse[]> {
    return this.http.get<StudentFeesResponse[]>(`${this.apiUrl}/my-students`);
  }
    // Update student fees
    updateStudentFees(
      feesId: number,
      request: UpdateStudentFeesRequest
    ): Observable<StudentFeesResponse> {
      return this.http.put<StudentFeesResponse>(`${this.apiUrl}/${feesId}`, request);
    }

    // Delete student fees
    deleteStudentFees(feesId: number): Observable<void> {
      return this.http.delete<void>(`${this.apiUrl}/${feesId}`);
    }
  }
