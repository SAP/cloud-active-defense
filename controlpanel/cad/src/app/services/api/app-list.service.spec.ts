import { TestBed } from '@angular/core/testing';

import { AppListService } from './app-list.service';

describe('AppListService', () => {
  let service: AppListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
