import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/loginServices/auth-service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedPermissions = route.data?.['permissions'] as string[] | undefined;

  if (allowedPermissions?.length && authService.hasAnyPermission(allowedPermissions)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
