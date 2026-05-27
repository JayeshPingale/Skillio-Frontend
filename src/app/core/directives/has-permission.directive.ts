import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { AuthService } from '../services/loginServices/auth-service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);
  private requiredPermissions: string[] = [];

  @Input('appHasPermission')
  set appHasPermission(value: string | string[] | null) {
    this.requiredPermissions = Array.isArray(value) ? value : value ? [value] : [];
    this.updateView();
  }

  private updateView(): void {
    const canRender =
      this.requiredPermissions.length > 0 &&
      this.authService.hasAllPermissions(this.requiredPermissions);

    this.viewContainer.clear();
    if (canRender) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
