import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/loginServices/auth-service';

export const permissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const requiredPermission = route.data?.['permission'] as string | undefined;
  const anyPermissions = route.data?.['anyPermissions'] as string[] | undefined;
  const allPermissions = route.data?.['allPermissions'] as string[] | undefined;

  const hasRequiredPermission = requiredPermission
    ? authService.hasPermission(requiredPermission)
    : true;
  const hasAnyPermissions = anyPermissions?.length
    ? authService.hasAnyPermission(anyPermissions)
    : true;
  const hasAllPermissions = allPermissions?.length
    ? authService.hasAllPermissions(allPermissions)
    : true;

  if (hasRequiredPermission && hasAnyPermissions && hasAllPermissions) {
    return true;
  }

  router.navigate(['/unauthorized'], {
    state: {
      message: 'You do not have permission to access this page.',
      attemptedUrl: state.url,
    },
  });
  return false;
};
