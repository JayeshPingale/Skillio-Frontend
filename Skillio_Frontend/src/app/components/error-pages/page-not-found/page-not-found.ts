import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../../core/services/theme/theme-service';

@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-not-found.html',
  styleUrls: ['./page-not-found.css']
})
export class PageNotFoundComponent implements OnInit, OnDestroy {
  countdown: number = 10;
  private countdownInterval: any;

  constructor(
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    this.startCountdown();
  }

  startCountdown() {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown === 0) {
        this.goToLogin();
      }
    }, 1000);
  }

  goToLogin() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/login']);
  }

  goBack() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    window.history.back();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}
