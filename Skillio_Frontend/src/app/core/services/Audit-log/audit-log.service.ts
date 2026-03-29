// src/app/core/services/audit-logs/audit-log.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface AuditLogDTO {
  auditId: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValue: string;
  newValue: string;
  performedByUserId: number;
  performedByUserName: string;
  performedByUserEmail: string;
  ipAddress: string;
  userAgent: string;
  performedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/audit-logs`;

  // Get all audit logs
  getAllAuditLogs(): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(this.apiUrl);
  }

  // Get audit log by ID
  getAuditLogById(id: number): Observable<AuditLogDTO> {
    return this.http.get<AuditLogDTO>(`${this.apiUrl}/${id}`);
  }

  // Get by entity type
  getAuditLogsByEntityType(entityType: string): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(`${this.apiUrl}/entity-type/${entityType}`);
  }

  // Get by entity type and ID
  getAuditLogsByEntityTypeAndId(entityType: string, entityId: number): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(`${this.apiUrl}/entity/${entityType}/${entityId}`);
  }

  // Get by user
  getAuditLogsByUser(userId: number): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(`${this.apiUrl}/user/${userId}`);
  }

  // Get by action
  getAuditLogsByAction(action: string): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(`${this.apiUrl}/action/${action}`);
  }

  // Get by date range
  getAuditLogsByDateRange(startDate: string, endDate: string): Observable<AuditLogDTO[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<AuditLogDTO[]>(`${this.apiUrl}/date-range`, { params });
  }
}
