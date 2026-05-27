// src/app/core/services/follow-up/follow-up.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  FollowUpResponse, 
  FollowUpRequest, 
  UpdateFollowUpRequest,
  FollowUpStats 
} from '../../models/follow-up.model';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class FollowUpService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/follow-ups`;

  // Get all follow-ups (Admin only)
  getAllFollowUps(): Observable<FollowUpResponse[]> {
    return this.http.get<FollowUpResponse[]>(this.apiUrl);
  }

  // Get follow-up by ID
  getFollowUpById(followUpId: number): Observable<FollowUpResponse> {
    return this.http.get<FollowUpResponse>(`${this.apiUrl}/${followUpId}`);
  }

  // Get follow-ups by lead
  getFollowUpsByLead(leadId: number): Observable<FollowUpResponse[]> {
    return this.http.get<FollowUpResponse[]>(`${this.apiUrl}/lead/${leadId}`);
  }

  // Get my follow-ups (Sales Executive)
  getMyFollowUps(): Observable<FollowUpResponse[]> {
    return this.http.get<FollowUpResponse[]>(`${this.apiUrl}/my-follow-ups`);
  }

  // Get follow-ups by status
  getFollowUpsByStatus(status: string): Observable<FollowUpResponse[]> {
    return this.http.get<FollowUpResponse[]>(`${this.apiUrl}/status/${status}`);
  }

  // Get follow-ups due today
  getFollowUpsDueToday(): Observable<FollowUpResponse[]> {
    return this.http.get<FollowUpResponse[]>(`${this.apiUrl}/due-today`);
  }

  // Get overdue follow-ups
  getOverdueFollowUps(): Observable<FollowUpResponse[]> {
    return this.http.get<FollowUpResponse[]>(`${this.apiUrl}/overdue`);
  }

  // Create follow-up
  createFollowUp(request: FollowUpRequest): Observable<FollowUpResponse> {
    return this.http.post<FollowUpResponse>(this.apiUrl, request);
  }

  // Update follow-up
  updateFollowUp(followUpId: number, request: UpdateFollowUpRequest): Observable<FollowUpResponse> {
    return this.http.put<FollowUpResponse>(`${this.apiUrl}/${followUpId}`, request);
  }

  // Mark follow-up as completed
  markFollowUpCompleted(followUpId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${followUpId}/complete`, {});
  }

  // Delete follow-up
  deleteFollowUp(followUpId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${followUpId}`);
  }
}
