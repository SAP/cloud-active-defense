import { TestBed } from '@angular/core/testing';

import { ConfigmanagerApiService } from './configmanager-api.service';

describe('ConfigmanagerApiService', () => {
  let service: ConfigmanagerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigmanagerApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
