import { TestBed } from '@angular/core/testing';

import { ConfigApiService } from './config-api.service';

describe('ConfigApiService', () => {
  let service: ConfigApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
