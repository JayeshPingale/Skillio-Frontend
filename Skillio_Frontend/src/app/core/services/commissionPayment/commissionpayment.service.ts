import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
export interface CommissionPaymentDTO {
  commissionPaymentId: number;
  commissionId: number;
  salesExecutiveId: number;
  salesExecutiveName: string;
  salesExecutiveEmail: string;
  amountPaid: number;
  paymentMode: string;
  paymentDate: string;
  transactionId?: string;
  paidByUserId: number;
  paidByUserName: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommissionPaymentDTO {
  commissionId: number;
  amountPaid: number;
  paymentDate: string;
  paymentMode: string;
  transactionId?: string;
  remarks?: string;
}

export interface UpdateCommissionPaymentDTO {
  paymentDate?: string;
  transactionId?: string;
  remarks?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommissionPaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/commission-payments`;

  getAllCommissionPayments(): Observable<CommissionPaymentDTO[]> {
    return this.http.get<CommissionPaymentDTO[]>(this.apiUrl).pipe(
      tap(data => console.log('✅ Fetched commission payments:', data)),
      catchError(this.handleError)
    );
  }

  getCommissionPaymentById(id: number): Observable<CommissionPaymentDTO> {
    return this.http.get<CommissionPaymentDTO>(`${this.apiUrl}/${id}`).pipe(
      tap(data => console.log('✅ Fetched payment:', data)),
      catchError(this.handleError)
    );
  }

  getCommissionPaymentByCommissionId(commissionId: number): Observable<CommissionPaymentDTO> {
    return this.http.get<CommissionPaymentDTO>(`${this.apiUrl}/commission/${commissionId}`);
  }

  getCommissionPaymentsPaidBy(userId: number): Observable<CommissionPaymentDTO[]> {
    return this.http.get<CommissionPaymentDTO[]>(`${this.apiUrl}/paid-by/${userId}`);
  }

  payCommission(request: CreateCommissionPaymentDTO): Observable<CommissionPaymentDTO> {
    console.log('📤 API Payload:', request);
    return this.http.post<CommissionPaymentDTO>(this.apiUrl, request).pipe(
      tap(response => console.log('✅ Payment created:', response)),
      catchError(this.handleError)
    );
  }

  updateCommissionPayment(id: number, request: UpdateCommissionPaymentDTO): Observable<CommissionPaymentDTO> {
    return this.http.put<CommissionPaymentDTO>(`${this.apiUrl}/${id}`, request).pipe(
      tap(response => console.log('✅ Payment updated:', response)),
      catchError(this.handleError)
    );
  }

  deleteCommissionPayment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => console.log('✅ Payment deleted')),
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('❌ API Error:', error);
    if (error.error) {
      console.error('Error details:', error.error);
    }
    return throwError(() => error);
  }
}
