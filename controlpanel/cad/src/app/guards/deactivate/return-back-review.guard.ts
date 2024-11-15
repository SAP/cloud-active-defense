import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface ReturnBackReviewDeactivate {
  returnBackReview: (nextRoute: string, currentRoute: string) => Observable<boolean> | Promise<boolean> | boolean;
}

export const returnBackReviewGuard: CanDeactivateFn<ReturnBackReviewDeactivate> = (component, currentRoute, currentState, nextState) => {
  return component.returnBackReview(nextState.url, currentRoute.url.toString());
};
