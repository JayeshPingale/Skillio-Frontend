import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AuthService,
  ForgotPasswordOtpVerificationRequest,
  ForgotPasswordRequest,
  ForgotPasswordResetRequest,
} from '../../core/services/loginServices/auth-service';
import { ThemeService } from '../../core/services/theme/theme-service';

type ForgotStep = 1 | 2 | 3;
type FeedbackTone = 'error' | 'success' | 'info';

@Component({
  selector: 'app-forgot-password-page-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password-page-component.html',
  styleUrls: ['./forgot-password-page-component.css'],
})
export class ForgotPasswordPageComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly themeService = inject(ThemeService);

  readonly currentStep = signal<ForgotStep>(1);
  readonly email = signal('');
  readonly otp = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  readonly requestLoading = signal(false);
  readonly verifyLoading = signal(false);
  readonly resetLoading = signal(false);

  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly feedbackMessage = signal('');
  readonly feedbackTone = signal<FeedbackTone>('info');
  readonly cooldownRemainingSeconds = signal(0);

  readonly stepTitles = [
    { id: 1 as ForgotStep, eyebrow: 'Step 1', title: 'Request OTP', subtitle: 'We will send a 5-digit code to your inbox.' },
    { id: 2 as ForgotStep, eyebrow: 'Step 2', title: 'Verify OTP', subtitle: 'Enter the OTP exactly as it appears in your mail.' },
    { id: 3 as ForgotStep, eyebrow: 'Step 3', title: 'Reset Password', subtitle: 'Set your new password and jump back into Skillio.' },
  ];

  readonly isBusy = computed(() => this.requestLoading() || this.verifyLoading() || this.resetLoading());
  readonly isCooldownActive = computed(() => this.cooldownRemainingSeconds() > 0);
  readonly cooldownLabel = computed(() => {
    const total = this.cooldownRemainingSeconds();
    const minutes = Math.floor(total / 60).toString().padStart(2, '0');
    const seconds = (total % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  });
  readonly maskedEmail = computed(() => {
    const value = this.email().trim();
    const [localPart, domain] = value.split('@');
    if (!localPart || !domain) {
      return value;
    }

    const safeLocal =
      localPart.length <= 2
        ? `${localPart[0] ?? ''}*`
        : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(1, localPart.length - 2))}`;

    return `${safeLocal}@${domain}`;
  });

  private cooldownTimerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const presetEmail = this.route.snapshot.queryParamMap.get('email');
    if (presetEmail) {
      this.email.set(presetEmail.trim());
    }
  }

  ngOnDestroy(): void {
    this.clearCooldownTimer();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  updateEmail(value: string): void {
    this.email.set(value.trim());
  }

  updateOtp(value: string): void {
    this.otp.set(value.replace(/\D/g, '').slice(0, 5));
  }

  updateNewPassword(value: string): void {
    this.newPassword.set(value);
  }

  updateConfirmPassword(value: string): void {
    this.confirmPassword.set(value);
  }

  requestOtp(isResend = false): void {
    if (this.requestLoading() || this.isCooldownActive()) {
      return;
    }

    const email = this.email().trim();
    if (!this.isValidEmail(email)) {
      this.showFeedback('error', 'Please enter a valid email address');
      return;
    }

    this.requestLoading.set(true);
    this.clearFeedback();

    const payload: ForgotPasswordRequest = { email };

    this.authService.requestForgotPasswordOtp(payload).subscribe({
      next: (response) => {
        this.requestLoading.set(false);
        this.currentStep.set(2);
        this.otp.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.showFeedback(
          'success',
          this.extractMessage(
            response,
            isResend ? 'A fresh OTP is on its way.' : 'OTP sent successfully. Check your inbox.'
          )
        );
      },
      error: (error: HttpErrorResponse) => {
        this.requestLoading.set(false);
        this.handleApiError(error, 'We could not send the OTP right now.');
      },
    });
  }

  verifyOtp(): void {
    if (this.verifyLoading() || this.isCooldownActive()) {
      return;
    }

    const email = this.email().trim();
    const otp = this.otp().trim();

    if (!this.isValidEmail(email)) {
      this.showFeedback('error', 'Please enter a valid email address');
      this.currentStep.set(1);
      return;
    }

    if (!/^\d{5}$/.test(otp)) {
      this.showFeedback('error', 'OTP must be exactly 5 digits');
      return;
    }

    this.verifyLoading.set(true);
    this.clearFeedback();

    const payload: ForgotPasswordOtpVerificationRequest = { email, otp };

    this.authService.verifyForgotPasswordOtp(payload).subscribe({
      next: (response) => {
        this.verifyLoading.set(false);
        this.currentStep.set(3);
        this.showFeedback('success', this.extractMessage(response, 'OTP verified successfully.'));
      },
      error: (error: HttpErrorResponse) => {
        this.verifyLoading.set(false);
        this.handleApiError(error, 'We could not verify that OTP.');
      },
    });
  }

  resetPassword(): void {
    if (this.resetLoading() || this.isCooldownActive()) {
      return;
    }

    const email = this.email().trim();
    const otp = this.otp().trim();
    const newPassword = this.newPassword();
    const confirmPassword = this.confirmPassword();

    if (!this.isValidEmail(email)) {
      this.showFeedback('error', 'Please enter a valid email address');
      this.currentStep.set(1);
      return;
    }

    if (!/^\d{5}$/.test(otp)) {
      this.showFeedback('error', 'OTP must be exactly 5 digits');
      this.currentStep.set(2);
      return;
    }

    if (newPassword.length < 6) {
      this.showFeedback('error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showFeedback('error', 'Confirm password must match');
      return;
    }

    this.resetLoading.set(true);
    this.clearFeedback();

    const payload: ForgotPasswordResetRequest = {
      email,
      otp,
      newPassword,
      confirmPassword,
    };

    this.authService.resetForgotPassword(payload).subscribe({
      next: (response) => {
        const successMessage = this.extractMessage(response, 'Password reset successfully.');
        this.resetLoading.set(false);
        this.router.navigate(['/login'], {
          queryParams: {
            passwordReset: 'success',
            email,
          },
          state: {
            successMessage,
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.resetLoading.set(false);
        this.handleApiError(error, 'We could not reset your password.');
      },
    });
  }

  resendOtp(): void {
    this.requestOtp(true);
  }

  goToStep(step: ForgotStep): void {
    if (this.isBusy()) {
      return;
    }

    if (step === 1) {
      this.currentStep.set(1);
      this.otp.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.clearFeedback();
      return;
    }

    if (step === 2 && this.email()) {
      this.currentStep.set(2);
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.clearFeedback();
    }
  }

  private handleApiError(error: HttpErrorResponse, fallbackMessage: string): void {
    const backendMessage = this.extractMessage(error.error, fallbackMessage);

    if (this.isCooldownMessage(backendMessage)) {
      this.startCooldown(10 * 60);
    }

    this.showFeedback('error', backendMessage);
  }

  private extractMessage(payload: unknown, fallbackMessage: string): string {
    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const candidateKeys = ['message', 'error', 'detail', 'debugMessage', 'apiMessage'];

      for (const key of candidateKeys) {
        if (key in payload) {
          const value = (payload as Record<string, unknown>)[key];
          if (typeof value === 'string' && value.trim()) {
            return value;
          }
        }
      }
    }

    return fallbackMessage;
  }

  private isCooldownMessage(message: string): boolean {
    return message.toLowerCase().includes('too many invalid otp attempts');
  }

  private startCooldown(seconds: number): void {
    this.clearCooldownTimer();
    this.cooldownRemainingSeconds.set(seconds);

    this.cooldownTimerId = setInterval(() => {
      const nextValue = this.cooldownRemainingSeconds() - 1;
      if (nextValue <= 0) {
        this.clearCooldownTimer();
        this.cooldownRemainingSeconds.set(0);
        return;
      }

      this.cooldownRemainingSeconds.set(nextValue);
    }, 1000);
  }

  private clearCooldownTimer(): void {
    if (this.cooldownTimerId) {
      clearInterval(this.cooldownTimerId);
      this.cooldownTimerId = null;
    }
  }

  private showFeedback(tone: FeedbackTone, message: string): void {
    this.feedbackTone.set(tone);
    this.feedbackMessage.set(message);
  }

  private clearFeedback(): void {
    this.feedbackMessage.set('');
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
