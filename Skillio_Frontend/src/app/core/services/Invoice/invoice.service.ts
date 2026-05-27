// src/app/core/services/Invoice/invoice.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface InvoiceDTO {
  invoiceId: number;
  paymentId: number;
  invoiceNumber: string;

  // Student Info
  studentId: number;
  studentCode: string;
  studentName: string;
  studentEmail: string;

  // Payment Info
  paymentMode: string;
  amount: number;        // ✅ ADD THIS LINE — ye missing tha
  paymentDate: string;
  transactionId: string;
  receiptNumber: string;

  // Invoice Info
  generatedDate: string;
  pdfPath: string;
  sentToEmail: boolean;
  sentToWhatsApp: boolean;
  sentDate: string;
  remarks: string;
  createdAt: string;
}

export interface CreateInvoiceDTO {
  paymentId: number;
}

export interface UpdateInvoiceDTO {
  pdfPath?: string;
  remarks?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/invoices`;

  getAllInvoices(): Observable<InvoiceDTO[]> {
    return this.http.get<InvoiceDTO[]>(this.apiUrl);
  }

  getInvoiceById(id: number): Observable<InvoiceDTO> {
    return this.http.get<InvoiceDTO>(`${this.apiUrl}/${id}`);
  }

  getInvoiceByPaymentId(paymentId: number): Observable<InvoiceDTO> {
    return this.http.get<InvoiceDTO>(`${this.apiUrl}/payment/${paymentId}`);
  }

  getInvoiceByInvoiceNumber(invoiceNumber: string): Observable<InvoiceDTO> {
    return this.http.get<InvoiceDTO>(`${this.apiUrl}/invoice-number/${invoiceNumber}`);
  }

  getPendingEmailInvoices(): Observable<InvoiceDTO[]> {
    return this.http.get<InvoiceDTO[]>(`${this.apiUrl}/pending-email`);
  }

  getPendingWhatsAppInvoices(): Observable<InvoiceDTO[]> {
    return this.http.get<InvoiceDTO[]>(`${this.apiUrl}/pending-whatsapp`);
  }

  generateInvoice(request: CreateInvoiceDTO): Observable<InvoiceDTO> {
    return this.http.post<InvoiceDTO>(this.apiUrl, request);
  }

  updateInvoice(id: number, request: UpdateInvoiceDTO): Observable<InvoiceDTO> {
    return this.http.put<InvoiceDTO>(`${this.apiUrl}/${id}`, request);
  }

  markAsSentToEmail(id: number): Observable<InvoiceDTO> {
    return this.http.patch<InvoiceDTO>(`${this.apiUrl}/${id}/mark-sent-email`, {});
  }

  markAsSentToWhatsApp(id: number): Observable<InvoiceDTO> {
    return this.http.patch<InvoiceDTO>(`${this.apiUrl}/${id}/mark-sent-whatsapp`, {});
  }

  deleteInvoice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getMyStudentsInvoices(): Observable<InvoiceDTO[]> {
    return this.http.get<InvoiceDTO[]>(`${this.apiUrl}/my-students-invoices`);
  }

  downloadPDF(invoiceId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${invoiceId}/download-pdf`, {
      responseType: 'blob',
    });
  }

  generatePDF(invoiceId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${invoiceId}/generate-pdf`, {});
  }
}
