// src/app/core/services/targets/target.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface TargetDTO {
  targetId: number;
  userId: number;
  userName: string;
  userEmail: string;
  targetPeriod: string;
  targetLeads: number;
  targetEnrollments: number;
  targetRevenue: number;
  achievedLeads: number;
  achievedEnrollments: number;
  achievedRevenue: number;
  leadsAchievementPercentage: number;
  enrollmentsAchievementPercentage: number;
  revenueAchievementPercentage: number;
  startDate: string;
  endDate: string;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTargetDTO {
  userId: number;
  targetPeriod: string;
  targetLeads: number;
  targetEnrollments: number;
  targetRevenue: number;
  startDate: string;
  endDate: string;
  remarks?: string;
}

export interface UpdateTargetDTO {
  targetLeads?: number;
  targetEnrollments?: number;
  targetRevenue?: number;
  endDate?: string;
  remarks?: string;
}

export interface UpdateTargetAchievementDTO {
  achievedLeads?: number;
  achievedEnrollments?: number;
  achievedRevenue?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TargetService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/targets`;

  // Get all targets
  getAllTargets(): Observable<TargetDTO[]> {
    return this.http.get<TargetDTO[]>(this.apiUrl);
  }

  // Get target by ID
  getTargetById(id: number): Observable<TargetDTO> {
    return this.http.get<TargetDTO>(`${this.apiUrl}/${id}`);
  }

  // Get targets by user
  getTargetsByUser(userId: number): Observable<TargetDTO[]> {
    return this.http.get<TargetDTO[]>(`${this.apiUrl}/user/${userId}`);
  }

  // Get targets by status
  getTargetsByStatus(status: string): Observable<TargetDTO[]> {
    return this.http.get<TargetDTO[]>(`${this.apiUrl}/status/${status}`);
  }

  // Get active targets
  getActiveTargets(): Observable<TargetDTO[]> {
    return this.http.get<TargetDTO[]>(`${this.apiUrl}/active`);
  }

  // Create target
  createTarget(request: CreateTargetDTO): Observable<TargetDTO> {
    return this.http.post<TargetDTO>(this.apiUrl, request);
  }

  // Update target
  updateTarget(id: number, request: UpdateTargetDTO): Observable<TargetDTO> {
    return this.http.put<TargetDTO>(`${this.apiUrl}/${id}`, request);
  }

  // Update target achievement
  updateTargetAchievement(id: number, request: UpdateTargetAchievementDTO): Observable<TargetDTO> {
    return this.http.patch<TargetDTO>(`${this.apiUrl}/${id}/achievement`, request);
  }

  // Mark as completed
  markAsCompleted(id: number): Observable<TargetDTO> {
    return this.http.patch<TargetDTO>(`${this.apiUrl}/${id}/mark-completed`, {});
  }

  // Delete target
  deleteTarget(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  // In target.service.ts
getMyTargets(): Observable<TargetDTO[]> {
  return this.http.get<TargetDTO[]>(`${this.apiUrl}/my-targets`);
}

}
