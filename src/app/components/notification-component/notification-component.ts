import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NotificationService, AppNotification } from '../../core/services/notification/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './notification-component.html',
  styleUrls: ['./notification-component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {

  notifications: AppNotification[] = [];
  unreadCount: number = 0;
  isDropdownOpen: boolean = false;
  isLoading: boolean = false;
  selectedNotification: AppNotification | null = null;

  // Toast notification
  toastNotification: AppNotification | null = null;
  private toastTimer: any = null;

  private unreadSub!: Subscription;
  private notifSub!: Subscription;
  private prevCount: number = 0;

  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      // ✅ Naya notification aaya toh toast dikhao
      if (count > this.prevCount && this.prevCount !== 0) {
        this.triggerToastForLatest();
      }
      this.prevCount = count;
      this.unreadCount = count;
      this.cdr.markForCheck();
    });

    this.notifSub = this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.notifSub?.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getNotifications().subscribe({
      next: () => { this.isLoading = false; this.cdr.markForCheck(); },
      error: () => { this.isLoading = false; }
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.selectedNotification = null;
      this.loadNotifications();
    }
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
    this.selectedNotification = null;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.status = 'READ');
        this.cdr.markForCheck();
      }
    });
  }

  markAsRead(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    if (notification.status === 'UNREAD') {
      this.notificationService.markAsRead(notification.notificationId).subscribe({
        next: () => { notification.status = 'READ'; this.cdr.markForCheck(); }
      });
    }
  }

  openNotificationDetail(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    this.selectedNotification = notification;
    if (notification.status === 'UNREAD') {
      this.markAsRead(notification, event);
    }
  }

  closeNotificationDetail(): void {
    this.selectedNotification = null;
  }

  deleteNotif(notificationId: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(
          n => n.notificationId !== notificationId
        );
        if (this.selectedNotification?.notificationId === notificationId) {
          this.selectedNotification = null;
        }
        this.cdr.markForCheck();
      }
    });
  }

  // ✅ Toast trigger — latest unread notification dikhao
  triggerToastForLatest(): void {
    this.notificationService.getNotifications().subscribe(notifications => {
      const latest = notifications.find(n => n.status === 'UNREAD');
      if (latest) {
        this.showToast(latest);
      }
    });
  }

  showToast(notification: AppNotification): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastNotification = notification;
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => {
      this.toastNotification = null;
      this.cdr.markForCheck();
    }, 5000);
  }

  dismissToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastNotification = null;
    this.cdr.markForCheck();
  }

  getNotificationIcon(type: string): string {
    const icons: { [k: string]: string } = {
      'COMMISSION_REQUEST':  '📋',
      'COMMISSION_APPROVED': '✅',
      'COMMISSION_REJECTED': '❌',
      'COMMISSION_PAID':     '💸',
      'PAYMENT_DONE':        '💰',
      'GENERAL':             '🔔',
    };
    return icons[type] || '🔔';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority?.toLowerCase() || 'medium'}`;
  }

  getTimeAgo(createdAt: any): string {
    if (!createdAt) return 'Unknown';

    let date: Date;
    if (Array.isArray(createdAt)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = createdAt;
      date = new Date(year, month - 1, day, hour, minute, second);
    } else {
      date = new Date(createdAt);
    }

    if (isNaN(date.getTime())) return 'Just now';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}