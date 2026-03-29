import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PermissionResponse {
  permissionId: number;
  permissionName: string;
  module: string;
  description: string;
}

export interface PermissionRequest {
  permissionName: string;
  module: string;
  action: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/permissions';

  getAllPermissions(): Observable<PermissionResponse[]> {
    return this.http.get<PermissionResponse[]>(this.apiUrl);
  }

  getPermissionById(permissionId: number): Observable<PermissionResponse> {
    return this.http.get<PermissionResponse>(`${this.apiUrl}/${permissionId}`);
  }

  getPermissionByName(permissionName: string): Observable<PermissionResponse> {
    return this.http.get<PermissionResponse>(`${this.apiUrl}/name/${permissionName}`);
  }

  getPermissionsByModule(module: string): Observable<PermissionResponse[]> {
    return this.http.get<PermissionResponse[]>(`${this.apiUrl}/module/${module}`);
  }

  createPermission(request: PermissionRequest): Observable<PermissionResponse> {
    return this.http.post<PermissionResponse>(this.apiUrl, request);
  }

  deletePermission(permissionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${permissionId}`);
  }
}
