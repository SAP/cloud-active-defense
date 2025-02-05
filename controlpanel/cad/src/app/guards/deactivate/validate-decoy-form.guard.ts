import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface ValidateDecoyFormDeactivate {
  validateDecoyForm: (nextRoute: string) => Observable<boolean> | Promise<boolean> | boolean;
}

export const validateDecoyFormGuard: CanDeactivateFn<ValidateDecoyFormDeactivate> = (component, currentRoute, currentState, nextState) => {
  return component.validateDecoyForm(nextState.url);
};
