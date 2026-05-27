import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LeadStatusHistoryResponse {
  historyId: number;
  leadId: number;
  leadName: string;
  oldStatus: string;
  newStatus: string;
  changedByUserId: number;
  changedByUserName: string;
  remarks: string;
  changedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeadStatusHistoryService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/lead-status-history';

  // Get all status history (Admin only)
  getAllHistory(): Observable<LeadStatusHistoryResponse[]> {
    return this.http.get<LeadStatusHistoryResponse[]>(this.apiUrl);
  }

  // Get history for specific lead
  getHistoryByLead(leadId: number): Observable<LeadStatusHistoryResponse[]> {
    return this.http.get<LeadStatusHistoryResponse[]>(`${this.apiUrl}/lead/${leadId}`);
  }

  // Get history by user (Admin only)
  getHistoryByUser(userId: number): Observable<LeadStatusHistoryResponse[]> {
    return this.http.get<LeadStatusHistoryResponse[]>(`${this.apiUrl}/user/${userId}`);
  }

  // Get my history (Sales Executive)
  getMyHistory(): Observable<LeadStatusHistoryResponse[]> {
    return this.http.get<LeadStatusHistoryResponse[]>(`${this.apiUrl}/my-history`);
  }
}