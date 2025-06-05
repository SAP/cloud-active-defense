import { TestBed } from '@angular/core/testing';

import { DeploymentManagerApiService } from './deployment-manager-api.service';

describe('DeploymentManagerApiService', () => {
  let service: DeploymentManagerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeploymentManagerApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
