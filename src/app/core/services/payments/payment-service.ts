import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

// ✅ RENAMED to avoid conflict with browser's PaymentResponse
export interface PaymentDTO {
  paymentId: number;
  
  // Student Info
  studentId: number;
  studentCode: string;
  studentName: string;
  studentEmail: string;
  
  // Fees Info
  feesId: number;
  totalFees: number;
  paidAmount: number;
  balanceAmount: number;
  
  // Payment Info
  amount: number;
  paymentMode: string; // CASH, CARD, UPI, NETBANKING, CHEQUE
  paymentDate: string; // LocalDate format: "2026-01-03"
  transactionId: string;
  receiptNumber: string;
  status: string; // SUCCESS, PENDING, FAILED
  
  // Admin Info
  receivedByUserId: number;
  receivedByUserName: string;
  
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ CreatePaymentRequest - Matches Backend CreatePaymentRequest.java
export interface CreatePaymentRequest {
  feesId: number;
  amount: number;
  paymentMode: string; // CASH, CARD, UPI, NETBANKING, CHEQUE
  paymentDate: string; // Format: "YYYY-MM-DD"
  transactionId?: string;
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payments`;

  // ✅ GET /api/payments
  getAllPayments(): Observable<PaymentDTO[]> {
    return this.http.get<PaymentDTO[]>(this.apiUrl);
  }

  // ✅ GET /api/payments/{paymentId}
  getPaymentById(paymentId: number): Observable<PaymentDTO> {
    return this.http.get<PaymentDTO>(`${this.apiUrl}/${paymentId}`);
  }

  // ✅ GET /api/payments/fees/{feesId} - YE CHAHIYE PAYMENT HISTORY KE LIYE
  getPaymentsByStudentFees(feesId: number): Observable<PaymentDTO[]> {
    console.log('🔥 Calling API: GET', `${this.apiUrl}/fees/${feesId}`);
    return this.http.get<PaymentDTO[]>(`${this.apiUrl}/fees/${feesId}`);
  }

  // ✅ GET /api/payments/student/{studentId}
  getPaymentsByStudent(studentId: number): Observable<PaymentDTO[]> {
    return this.http.get<PaymentDTO[]>(`${this.apiUrl}/student/${studentId}`);
  }

  // ✅ GET /api/payments/received-by/{userId}
  getPaymentsByReceivedBy(userId: number): Observable<PaymentDTO[]> {
    return this.http.get<PaymentDTO[]>(`${this.apiUrl}/received-by/${userId}`);
  }

  // ✅ GET /api/payments/date-range
  getPaymentsByDateRange(startDate: string, endDate: string): Observable<PaymentDTO[]> {
    return this.http.get<PaymentDTO[]>(`${this.apiUrl}/date-range`, {
      params: { startDate, endDate }
    });
  }

  // ✅ GET /api/payments/status/{status}
  getPaymentsByStatus(status: string): Observable<PaymentDTO[]> {
    return this.http.get<PaymentDTO[]>(`${this.apiUrl}/status/${status}`);
  }

  // ✅ POST /api/payments - CREATE PAYMENT
  createPayment(request: CreatePaymentRequest): Observable<PaymentDTO> {
    console.log('🔥 Calling API: POST', this.apiUrl, request);
    return this.http.post<PaymentDTO>(this.apiUrl, request);
  }

  // ✅ PATCH /api/payments/{paymentId}/status
  updatePaymentStatus(paymentId: number, status: string): Observable<PaymentDTO> {
    return this.http.patch<PaymentDTO>(
      `${this.apiUrl}/${paymentId}/status`,
      null,
      { params: { status } }
    );
  }

  getMyPayments(): Observable<PaymentDTO[]> {
  return this.http.get<PaymentDTO[]>(`${this.apiUrl}/my-payments`);
}
  // ✅ DELETE /api/payments/{paymentId}
  deletePayment(paymentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${paymentId}`);
  }
}
