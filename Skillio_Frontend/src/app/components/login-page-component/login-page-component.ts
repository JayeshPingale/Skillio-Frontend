import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationExtras, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, UserLoginRequest } from '../../core/services/loginServices/auth-service';
import { ThemeService } from '../../core/services/theme/theme-service';

@Component({
  selector: 'app-login-page-component',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login-page-component.html',
  styleUrls: ['./login-page-component.css']
})
export class LoginPageComponent {
  email = signal('');
  password = signal('');
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    public themeService: ThemeService  
  ) {
    const passwordReset = this.route.snapshot.queryParamMap.get('passwordReset');
    const rememberedEmail = this.route.snapshot.queryParamMap.get('email');
    const successFromState = this.router.getCurrentNavigation()?.extras.state?.['successMessage'];

    if (rememberedEmail) {
      this.email.set(rememberedEmail.trim());
    }

    if (passwordReset === 'success') {
      this.successMessage.set(
        typeof successFromState === 'string' && successFromState.trim()
          ? successFromState
          : 'Password reset successfully. Please sign in with your new password.'
      );
    }
  }

  // ✅ Theme toggle method
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  updateEmail(value: string) {
    this.email.set(value);
  }

  updatePassword(value: string) {
    this.password.set(value);
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');
    
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Please enter both email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email())) {
      this.errorMessage.set('Please enter a valid email address');
      return;
    }

    this.isLoading.set(true);

    const loginRequest: UserLoginRequest = {
      email: this.email(),
      password: this.password()
    };

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        
        const navigationExtras: NavigationExtras = {
          state: {
            user: {
              fullName: response.fullName,
              role: response.roleName,
              userId: response.userId,
              permissions: response.permissions ?? [],
            },
          },
          replaceUrl: true
        };

        this.router.navigate([this.authService.getDefaultRoute()], navigationExtras);
      },
      error: (error) => {
        this.isLoading.set(false);
        
        if (error.status === 401) {
          this.errorMessage.set('Invalid email or password');
        } else if (error.status === 0) {
          this.errorMessage.set('Cannot connect to server. Please try again.');
        } else if (error.status === 403) {
          this.errorMessage.set('Access denied. Please contact administrator.');
        } else {
          this.errorMessage.set('An error occurred. Please try again later.');
        }
        
        console.error('Login error:', error);
      }
    });
  }
}
