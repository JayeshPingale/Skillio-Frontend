// src/app/core/services/payment-installments/payment-installment-service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface PaymentInstallmentDTO {
  installmentId: number;
  feesId: number;
  studentId: number;
  studentName: string;
  courseId: number;
  courseName: string;
  installmentNumber: number;
  installmentAmount: number;
  dueDate: string;
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInstallmentDTO {
  feesId: number;
  installmentNumber: number;
  installmentAmount: number;
  dueDate: string;
}

export interface UpdatePaymentInstallmentDTO {
  installmentAmount: number;
  dueDate: string;
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE';
}

@Injectable({
  providedIn: 'root'
})
export class PaymentInstallmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payment-installments`;

  // Get all installments
  getAllInstallments(): Observable<PaymentInstallmentDTO[]> {
    return this.http.get<PaymentInstallmentDTO[]>(this.apiUrl);
  }

  // Get installment by ID
  getInstallmentById(installmentId: number): Observable<PaymentInstallmentDTO> {
    return this.http.get<PaymentInstallmentDTO>(`${this.apiUrl}/${installmentId}`);
  }

  // Get installments by fees
  getInstallmentsByFees(feesId: number): Observable<PaymentInstallmentDTO[]> {
    return this.http.get<PaymentInstallmentDTO[]>(`${this.apiUrl}/fees/${feesId}`);
  }

  // Get installments by student
  getInstallmentsByStudent(studentId: number): Observable<PaymentInstallmentDTO[]> {
    return this.http.get<PaymentInstallmentDTO[]>(`${this.apiUrl}/student/${studentId}`);
  }

  // Get installments by status
  getInstallmentsByStatus(status: string): Observable<PaymentInstallmentDTO[]> {
    return this.http.get<PaymentInstallmentDTO[]>(`${this.apiUrl}/status/${status}`);
  }

  // Get overdue installments
  getOverdueInstallments(): Observable<PaymentInstallmentDTO[]> {
    return this.http.get<PaymentInstallmentDTO[]>(`${this.apiUrl}/overdue`);
  }

  // Create installment
  createInstallment(request: CreatePaymentInstallmentDTO): Observable<PaymentInstallmentDTO> {
    return this.http.post<PaymentInstallmentDTO>(this.apiUrl, request);
  }

  // Update installment
  updateInstallment(installmentId: number, request: UpdatePaymentInstallmentDTO): Observable<PaymentInstallmentDTO> {
    return this.http.put<PaymentInstallmentDTO>(`${this.apiUrl}/${installmentId}`, request);
  }

  // Mark installment as paid
  markAsPaid(installmentId: number): Observable<PaymentInstallmentDTO> {
    return this.http.put<PaymentInstallmentDTO>(`${this.apiUrl}/${installmentId}/mark-paid`, {});
  }

  // Delete installment
  deleteInstallment(installmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${installmentId}`);
  }
}
