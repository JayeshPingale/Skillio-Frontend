import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RoleResponse {
  roleId: number;
  roleName: string;
  description: string;
  createdAt: string;
}

export interface RoleRequest {
  roleName: string;
  description: string;
}

export interface UpdateRoleRequest {
  roleName: string;
  description: string;
}

export interface RolePermissionResponse {
  roleId: number;
  roleName: string;
  permissionId: number;
  permissionName: string;
}

export interface AssignPermissionToRoleRequest {
  roleName: string; // ✅ Changed from roleId
  permissionNames: string[]; // ✅ Changed from permissionIds
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/roles';

  getAllRoles(): Observable<RoleResponse[]> {
    return this.http.get<RoleResponse[]>(this.apiUrl);
  }

  getRoleById(roleId: number): Observable<RoleResponse> {
    return this.http.get<RoleResponse>(`${this.apiUrl}/${roleId}`);
  }

  createRole(request: RoleRequest): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(this.apiUrl, request);
  }

  updateRole(roleId: number, request: UpdateRoleRequest): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(`${this.apiUrl}/${roleId}`, request);
  }

  deleteRole(roleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${roleId}`);
  }

  assignPermissions(request: AssignPermissionToRoleRequest): Observable<RolePermissionResponse[]> {
    return this.http.post<RolePermissionResponse[]>(`${this.apiUrl}/assign-permissions`, request);
  }

  getPermissionsForRole(roleId: number): Observable<RolePermissionResponse[]> {
    return this.http.get<RolePermissionResponse[]>(`${this.apiUrl}/${roleId}/permissions`);
  }
}
