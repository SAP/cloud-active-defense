import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';

import { validateDecoyFormGuard } from './validate-decoy-form.guard';

describe('validateDecoyFormGuard', () => {
  const executeGuard: CanDeactivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => validateDecoyFormGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
