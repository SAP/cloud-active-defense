import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { KeycloakService } from '../services/keycloak.service';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloakService = inject(KeycloakService);
  const token = keycloakService.keycloak?.token;
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }
  return next(req);
};

export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloakService = inject(KeycloakService);
  return next(req).pipe(
    tap({
      error: (error) => {
        if (error.error == 'Access denied') keycloakService.keycloak?.login();
      }
    })
  );
}