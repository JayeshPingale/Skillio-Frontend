import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { AuthService } from '../services/loginServices/auth-service';

@Directive({
  selector: '[appHasAnyPermission]',
  standalone: true,
})
export class HasAnyPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);
  private acceptedPermissions: string[] = [];

  @Input('appHasAnyPermission')
  set appHasAnyPermission(value: string[] | null) {
    this.acceptedPermissions = value ?? [];
    this.updateView();
  }

  private updateView(): void {
    const canRender =
      this.acceptedPermissions.length > 0 &&
      this.authService.hasAnyPermission(this.acceptedPermissions);

    this.viewContainer.clear();
    if (canRender) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
