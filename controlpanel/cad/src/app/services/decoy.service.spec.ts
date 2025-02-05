import { TestBed } from '@angular/core/testing';

import { DecoyService } from './decoy.service';

describe('DecoyService', () => {
  let service: DecoyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DecoyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
