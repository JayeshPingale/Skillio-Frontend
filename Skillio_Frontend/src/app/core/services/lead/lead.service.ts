import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// ✅ COMPLETE LeadResponse with ALL backend fields
export interface LeadResponse {
  leadId: number;
  fullName: string;
  contactNumber: string;
  email: string;
  courseInterested: string;
  collegeName: string;
  qualification: string;
  experience: string;
  interestLevel: string;
  status: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'QUALIFIED' | 'NEGOTIATION' | 'CONVERTED' | 'LOST';
  sourceId: number;
  sourceName: string;
  assignedToUserId: number | null;
  assignedToUserName: string;
  
  // ✅ ADD THESE - Sales Executive Info
  salesExecutiveId: number;
  salesExecutiveName: string;
  
  // ✅ ADD THIS - Converted Student ID (nullable)
  convertedStudentId?: number;
  
  comments: string;
  createdDate: string;
  lastContactDate: string;
  conversionDate: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ FIXED CreateLeadRequest
export interface CreateLeadRequest {
  fullName: string;
  contactNumber: string;
  email?: string;
  courseInterested: string;
  collegeName?: string;
  qualification?: string;
  experience?: string;
  interestLevel: string;
  sourceId: number;
  comments?: string;
}

// ✅ FIXED UpdateLeadRequest
export interface UpdateLeadRequest {
  fullName: string;
  contactNumber: string;
  email?: string;
  courseInterested: string;
  collegeName?: string;
  qualification?: string;
  experience?: string;
  interestLevel: string;
  comments?: string;
}

export interface AssignLeadRequest {
  leadId: number;
  salesExecutiveId: number;
  remarks?: string;
}

export interface LeadStatusChangeRequest {
  leadId: number;
  newStatus: string;
  remarks?: string;
}

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
  providedIn: 'root',
})
export class LeadService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/leads';

  // Get all leads (Admin only)
  getAllLeads(): Observable<LeadResponse[]> {
    return this.http.get<LeadResponse[]>(this.apiUrl);
  }

  // Get lead by ID
  getLeadById(leadId: number): Observable<LeadResponse> {
    return this.http.get<LeadResponse>(`${this.apiUrl}/${leadId}`);
  }

  // Get leads by status
  getLeadsByStatus(status: string): Observable<LeadResponse[]> {
    return this.http.get<LeadResponse[]>(`${this.apiUrl}/status/${status}`);
  }

  // Get my assigned leads (Sales Executive)
  getMyLeads(): Observable<LeadResponse[]> {
    return this.http.get<LeadResponse[]>(`${this.apiUrl}/my-leads`);
  }

  // Create new lead
  createLead(request: CreateLeadRequest): Observable<LeadResponse> {
    return this.http.post<LeadResponse>(this.apiUrl, request);
  }

  // Update lead
  updateLead(leadId: number, request: UpdateLeadRequest): Observable<LeadResponse> {
    return this.http.put<LeadResponse>(`${this.apiUrl}/${leadId}`, request);
  }

  // Delete lead
  deleteLead(leadId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${leadId}`);
  }

  // Change lead status
  changeLeadStatus(request: LeadStatusChangeRequest): Observable<LeadResponse> {
    return this.http.put<LeadResponse>(`${this.apiUrl}/change-status`, request);
  }

  // Assign lead to user
  assignLead(request: AssignLeadRequest): Observable<LeadResponse> {
    return this.http.put<LeadResponse>(`${this.apiUrl}/assign`, request);
  }

  // Unassign lead (Admin only)
  unassignLead(leadId: number): Observable<LeadResponse> {
    return this.http.put<LeadResponse>(`${this.apiUrl}/${leadId}/unassign`, {});
  }

  // Get lead status history
  getLeadStatusHistory(leadId: number): Observable<LeadStatusHistoryResponse[]> {
    return this.http.get<LeadStatusHistoryResponse[]>(`${this.apiUrl}/${leadId}/history`);
  }

  // Get leads by source
  getLeadsBySource(sourceId: number): Observable<LeadResponse[]> {
    return this.http.get<LeadResponse[]>(`${this.apiUrl}/source/${sourceId}`);
  }

  // Get leads assigned to specific user
  getLeadsByAssignedUser(userId: number): Observable<LeadResponse[]> {
    return this.http.get<LeadResponse[]>(`${this.apiUrl}/assigned-to/${userId}`);
  }

  // Get non-converted leads only (for enrollment)
  getNonConvertedLeads(): Observable<LeadResponse[]> {
    return this.http.get<LeadResponse[]>(`${this.apiUrl}/non-converted`);
  }
}
