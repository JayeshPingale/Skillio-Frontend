import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LeadSourceResponse {
  sourceId: number;
  name: string;
  channel: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadSourceRequest {
  name: string;
  channel: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeadSourceService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/lead-sources';

  getAllLeadSources(): Observable<LeadSourceResponse[]> {
    return this.http.get<LeadSourceResponse[]>(this.apiUrl);
  }

  getActiveLeadSources(): Observable<LeadSourceResponse[]> {
    return this.http.get<LeadSourceResponse[]>(`${this.apiUrl}/active`);
  }

  getLeadSourceById(sourceId: number): Observable<LeadSourceResponse> {
    return this.http.get<LeadSourceResponse>(`${this.apiUrl}/${sourceId}`);
  }

  createLeadSource(request: CreateLeadSourceRequest): Observable<LeadSourceResponse> {
    return this.http.post<LeadSourceResponse>(this.apiUrl, request);
  }

  updateLeadSource(sourceId: number, request: CreateLeadSourceRequest): Observable<LeadSourceResponse> {
    return this.http.put<LeadSourceResponse>(`${this.apiUrl}/${sourceId}`, request);
  }

  toggleLeadSourceStatus(sourceId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${sourceId}/toggle-status`, {});
  }

  deleteLeadSource(sourceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${sourceId}`);
  }
}
