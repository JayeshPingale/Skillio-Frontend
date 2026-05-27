import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DASHBOARD_ACCESS_PERMISSIONS } from '../../auth/permission.constants';

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordOtpVerificationRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordResetRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthMessageResponse {
  message?: string;
}

export interface UserLoginResponse {
  token: string;
  type: string;
  userId: number;
  roleName: string;
  fullName: string;
  permissions: string[];
}

export interface CurrentUser {
  type: string;
  userId: number;
  fullName: string;
  roleName: string;
  token: string;
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly storageKeys = {
    token: 'token',
    userId: 'userId',
    role: 'role',
    fullName: 'fullName',
    type: 'authType',
    permissions: 'permissions',
  } as const;

  currentUser = signal<CurrentUser | null>(this.getUserFromStorage());
  readonly permissions = computed(() => this.currentUser()?.permissions ?? []);

  constructor() {}

  login(loginRequest: UserLoginRequest): Observable<UserLoginResponse> {
    return this.http.post<UserLoginResponse>(`${this.apiUrl}/login`, loginRequest)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  requestForgotPasswordOtp(payload: ForgotPasswordRequest): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.apiUrl}/forgot-password/request`, payload);
  }

  verifyForgotPasswordOtp(payload: ForgotPasswordOtpVerificationRequest): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.apiUrl}/forgot-password/verify-otp`, payload);
  }

  resetForgotPassword(payload: ForgotPasswordResetRequest): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.apiUrl}/forgot-password/reset`, payload);
  }

  private setSession(response: UserLoginResponse): void {
    const permissions = Array.isArray(response.permissions) ? response.permissions : [];
    localStorage.setItem(this.storageKeys.token, response.token);
    localStorage.setItem(this.storageKeys.userId, response.userId.toString());
    localStorage.setItem(this.storageKeys.role, response.roleName);
    localStorage.setItem(this.storageKeys.fullName, response.fullName);
    localStorage.setItem(this.storageKeys.type, response.type);
    localStorage.setItem(this.storageKeys.permissions, JSON.stringify(permissions));

    const user: CurrentUser = {
      type: response.type,
      userId: response.userId,
      fullName: response.fullName,
      roleName: response.roleName,
      token: response.token,
      permissions,
    };

    this.currentUser.set(user);
  }

  private getUserFromStorage(): CurrentUser | null {
    const token = localStorage.getItem(this.storageKeys.token);
    const userId = localStorage.getItem(this.storageKeys.userId);
    const roleName = localStorage.getItem(this.storageKeys.role);
    const fullName = localStorage.getItem(this.storageKeys.fullName);
    const type = localStorage.getItem(this.storageKeys.type) ?? 'Bearer';
    const permissions = this.readPermissionsFromStorage();

    if (token && userId && roleName && fullName) {
      return {
        type,
        userId: parseInt(userId),
        fullName,
        roleName,
        token,
        permissions,
      };
    }
    return null;
  }

  private readPermissionsFromStorage(): string[] {
    const rawPermissions = localStorage.getItem(this.storageKeys.permissions);
    if (!rawPermissions) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawPermissions);
      return Array.isArray(parsed) ? parsed.filter((permission) => typeof permission === 'string') : [];
    } catch {
      return [];
    }
  }

  logout(): void {
    localStorage.removeItem(this.storageKeys.token);
    localStorage.removeItem(this.storageKeys.userId);
    localStorage.removeItem(this.storageKeys.role);
    localStorage.removeItem(this.storageKeys.fullName);
    localStorage.removeItem(this.storageKeys.type);
    localStorage.removeItem(this.storageKeys.permissions);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.currentUser()?.token;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getToken(): string | null {
    return this.currentUser()?.token ?? localStorage.getItem(this.storageKeys.token);
  }

  getRole(): string | null {
    return this.currentUser()?.roleName ?? localStorage.getItem(this.storageKeys.role);
  }

  getUserId(): number | null {
    return this.currentUser()?.userId ?? null;
  }

  getFullName(): string | null {
    return this.currentUser()?.fullName ?? localStorage.getItem(this.storageKeys.fullName);
  }

  getPermissions(): string[] {
    return this.permissions();
  }

  private normalizeRoleName(roleName: string | null | undefined): string {
    return (roleName ?? '')
      .trim()
      .toUpperCase()
      .replace(/^ROLE_/, '');
  }

  hasPermission(permission: string | null | undefined): boolean {
    if (!permission) {
      return false;
    }
    return this.permissions().includes(permission);
  }

  hasAnyPermission(permissions: string[] | null | undefined): boolean {
    if (!permissions?.length) {
      return false;
    }
    const userPermissions = this.permissions();
    return permissions.some((permission) => userPermissions.includes(permission));
  }

  hasAllPermissions(permissions: string[] | null | undefined): boolean {
    if (!permissions?.length) {
      return false;
    }
    const userPermissions = this.permissions();
    return permissions.every((permission) => userPermissions.includes(permission));
  }

  canAccessAdminDashboard(): boolean {
    return this.normalizeRoleName(this.getRole()) === 'ADMIN';
  }

  canAccessSalesDashboard(): boolean {
    return this.normalizeRoleName(this.getRole()) === 'SALES_EXECUTIVE';
  }

  getDefaultRoute(): string {
    if (this.canAccessAdminDashboard()) {
      return '/admin-dashboard';
    }

    if (this.canAccessSalesDashboard()) {
      return '/sales-dashboard';
    }

    if (this.hasAnyPermission([...DASHBOARD_ACCESS_PERMISSIONS])) {
      return '/sales-dashboard';
    }

    return '/unauthorized';
  }

  isAdmin(): boolean {
    return this.canAccessAdminDashboard();
  }

  isSalesExecutive(): boolean {
    return this.canAccessSalesDashboard();
  }

  hasRole(role: string): boolean {
    return this.normalizeRoleName(this.getRole()) === this.normalizeRoleName(role);
  }
}
