import { TestBed } from '@angular/core/testing';

import { DecoyApiService } from './decoy-api.service';

describe('DecoyApiService', () => {
  let service: DecoyApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DecoyApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
