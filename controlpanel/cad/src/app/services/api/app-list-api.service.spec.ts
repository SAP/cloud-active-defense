import { TestBed } from '@angular/core/testing';

import { AppListApiService } from './app-list-api.service';

describe('AppListApiService', () => {
  let service: AppListApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppListApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
