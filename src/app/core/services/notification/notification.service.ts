import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface AppNotification {
  notificationId: number;
  title: string;        // ✅ was: subject
  message: string;      // ✅ was: bodySummary
  type: string;
  status: string;
  relatedId: number;
  relatedEntityType: string;
  priority: string;
  createdAt: any;       // ✅ was: sentAt — any because Java array format aata hai
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private apiUrl = 'http://localhost:8080/api/notifications';

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private autoRefreshSub: Subscription | null = null;

  constructor(private http: HttpClient) {}

  initializeAfterLogin(): void {
    this.refreshUnreadCount();
    this.startAutoRefresh();
  }

  stopAutoRefresh(): void {
    this.autoRefreshSub?.unsubscribe();
    this.autoRefreshSub = null;
    this.unreadCountSubject.next(0);
    this.notificationsSubject.next([]);
  }

  getNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.apiUrl).pipe(
      tap(notifications => {
        this.notificationsSubject.next(notifications);
      }),
      catchError(error => {
        console.error('Error fetching notifications:', error);
        return of([]);
      })
    );
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(response => {
        this.unreadCountSubject.next(response.count);
      }),
      catchError(() => of({ count: 0 }))
    );
  }

  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${notificationId}/mark-read`, {}).pipe(
      tap(() => {
        this.refreshUnreadCount();
        this.refreshNotifications();
      }),
      catchError(() => of(null))
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/mark-all-read`, {}).pipe(
      tap(() => {
        this.refreshUnreadCount();
        this.refreshNotifications();
      }),
      catchError(() => of(null))
    );
  }

  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${notificationId}`).pipe(
      tap(() => {
        this.refreshUnreadCount();
        this.refreshNotifications();
      }),
      catchError(() => of(null))
    );
  }

  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  refreshNotifications(): void {
    this.getNotifications().subscribe();
  }

  private startAutoRefresh(): void {
    this.autoRefreshSub?.unsubscribe();
    this.autoRefreshSub = interval(30000).pipe(
      switchMap(() => this.getUnreadCount()),
      catchError(() => of({ count: 0 }))
    ).subscribe();
  }
}