import { Injectable } from '@angular/core';
import { ApiResponse } from '../models/api-response';
import { DeploymentManagerApiService } from './api/deployment-manager-api.service';
import { lastValueFrom, Subject, takeUntil } from 'rxjs';

export interface Deployment {
  name: string;
  maxReplicas: number;
  currentReplicas: number;
  protected: boolean;
  loadingInstall: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DeploymentManagerService {
  private cancelRequest$ = new Subject<void>();

  constructor(private deploymentManagerApi: DeploymentManagerApiService) { }
  
  async getNamespaces(): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.deploymentManagerApi.getNamespaces());
      return apiResponse;
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when fetching config", type: 'error' };
    }
  }
  async getDeployments(namespace: string): Promise<ApiResponse> {
    try {
      this.cancelRequest$.next();
      return lastValueFrom(this.deploymentManagerApi.getDeployments(namespace).pipe(takeUntil(this.cancelRequest$)));
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when fetching config", type: 'error' };
    }
  }
  async uploadKubeconfig(file: File): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('kubeconfig', file, file.name);
      const apiResponse = await lastValueFrom(this.deploymentManagerApi.uploadKubeconfig(formData));
      return apiResponse;
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when uploading kubeconfig", type: 'error' };
    }
  }
  async downloadSetupScript(): Promise<ApiResponse> {
    try {
      const aSH = document.createElement('a');
      aSH.href = "/install.sh";
      aSH.download = 'install.sh';
      aSH.click();

      const aBAT = document.createElement('a');
      aBAT.href = "/install.bat";
      aBAT.download = 'install.bat';
      aBAT.click();

      return { message: 'Successful download', type: 'success' };
    } catch(e: any) {
      return { message: "Error when downloading setup script", type: 'error' };
    }
  }
  async installCADForApp(namespace: string, deploymentName: string): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.deploymentManagerApi.installCADForApp(namespace, deploymentName));
      return apiResponse;
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when installing CAD for app", type: 'error' };
    }
  }
  async cleanCluster(): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.deploymentManagerApi.cleanCluster());
      return apiResponse;
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when cleaning cluster for app", type: 'error' };
    }
  }
}
