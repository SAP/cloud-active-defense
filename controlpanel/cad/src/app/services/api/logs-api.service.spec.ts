import { TestBed } from '@angular/core/testing';

import { LogsApiService } from './logs-api.service';

describe('LogsApiService', () => {
  let service: LogsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LogsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
