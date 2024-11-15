import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';

import { returnBackReviewGuard } from './return-back-review.guard';

describe('returnBackReviewGuard', () => {
  const executeGuard: CanDeactivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => returnBackReviewGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
