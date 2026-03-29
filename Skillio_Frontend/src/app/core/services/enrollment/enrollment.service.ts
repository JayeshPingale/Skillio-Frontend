import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface EnrollmentResponse {
  enrollmentId: number;

  studentId: number;
  studentCode: string;
  studentName: string;
  studentEmail: string;

  batchId: number;
  batchCode: string;
  batchName: string;

  courseId: number;
  courseName: string;

  enrollmentDate: string;
  totalCourseFees: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  admittedByUserId: number;
  admittedByUserName: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
    discountPercentage: number;
  discountAmount: number;
  discountReason?: string;
}

export interface CreateEnrollmentRequest {
  studentId: number;
  batchId: number;
  courseId: number;
  enrollmentDate: string; // yyyy-MM-dd
  totalCourseFees: number; // BigDecimal compatible
  remarks?: string;
    discountPercentage: number;
  discountAmount: number;
  discountReason?: string;
}

export interface UpdateEnrollmentRequest {
  totalCourseFees: number;
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  remarks?: string;
    discountPercentage: number;
  discountAmount: number;
  discountReason?: string;
}

export interface CreateEnrollmentFromLeadRequest {
  leadId: number;
  batchId: number;
  courseId: number;
  enrollmentDate: string; // yyyy-MM-dd
  totalCourseFees: number;
  remarks?: string;
  discountPercentage: number;
  discountAmount: number;
  discountReason?: string;
}

export interface ConvertLeadAndEnrollResponse {
  enrollmentId: number;
  studentId: number;
}



export interface EnrollmentStats {
  total: number;
  active: number;
  completed: number;
  dropped: number;
  pendingPayment: number;
  partialPayment: number;
  fullPayment: number;
}

@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/enrollments`;

  // Get all enrollments
  getAllEnrollments(): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(this.apiUrl);
  }

  // Get enrollment by ID
  getEnrollmentById(enrollmentId: number): Observable<EnrollmentResponse> {
    return this.http.get<EnrollmentResponse>(`${this.apiUrl}/${enrollmentId}`);
  }

  // Get enrollments by student
  getEnrollmentsByStudent(studentId: number): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(`${this.apiUrl}/student/${studentId}`);
  }

  // Get enrollments by batch
  getEnrollmentsByBatch(batchId: number): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(`${this.apiUrl}/batch/${batchId}`);
  }

  // Get enrollments by course
  getEnrollmentsByCourse(courseId: number): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(`${this.apiUrl}/course/${courseId}`);
  }

  // Get enrollments by payment status
  getEnrollmentsByPaymentStatus(status: string): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(`${this.apiUrl}/payment-status/${status}`);
  }

  // Get enrollments by enrollment status
  getEnrollmentsByEnrollmentStatus(status: string): Observable<EnrollmentResponse[]> {
    return this.http.get<EnrollmentResponse[]>(`${this.apiUrl}/enrollment-status/${status}`);
  }

  // Create enrollment
  createEnrollment(request: CreateEnrollmentRequest): Observable<EnrollmentResponse> {
    return this.http.post<EnrollmentResponse>(this.apiUrl, request);
  }
convertLeadAndEnroll(
  request: CreateEnrollmentFromLeadRequest
): Observable<ConvertLeadAndEnrollResponse> {
  return this.http.post<ConvertLeadAndEnrollResponse>(
    `${this.apiUrl}/convert-from-lead`,
    request
  );
}
getMyEnrollments(): Observable<EnrollmentResponse[]> {
  return this.http.get<EnrollmentResponse[]>(`${this.apiUrl}/my-enrollments`);
}

  // Update enrollment
  updateEnrollment(
    enrollmentId: number,
    request: UpdateEnrollmentRequest
  ): Observable<EnrollmentResponse> {
    return this.http.put<EnrollmentResponse>(`${this.apiUrl}/${enrollmentId}`, request);
  }

  // Delete enrollment
  deleteEnrollment(enrollmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${enrollmentId}`);
  }
}
