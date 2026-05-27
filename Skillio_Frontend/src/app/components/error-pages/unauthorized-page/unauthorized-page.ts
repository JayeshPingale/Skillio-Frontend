import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/loginServices/auth-service';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './unauthorized-page.html',
  styleUrls: ['./unauthorized-page.css'],
})
export class UnauthorizedPageComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly message =
    (history.state?.message as string | undefined) ??
    'You do not have permission to access this page.';

  goBack(): void {
    this.router.navigate([this.authService.getDefaultRoute()]);
  }
}
