import { TestBed } from '@angular/core/testing';

import { DeploymentManagerService } from './deployment-manager.service';

describe('DeploymentManagerService', () => {
  let service: DeploymentManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeploymentManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
