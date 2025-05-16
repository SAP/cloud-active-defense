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
  
  async getNamespaces(cu_id: string): Promise<ApiResponse> {
    try {
      if (!cu_id) {
        return { message: "No customer ID found", type: 'error' };
      }
      const apiResponse = await lastValueFrom(this.deploymentManagerApi.getNamespaces(cu_id));
      return apiResponse;
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when fetching config", type: 'error' };
    }
  }
  async getDeployments(cu_id: string, namespace: string): Promise<ApiResponse> {
    try {
      if (!cu_id) {
        return { message: "No customer ID found", type: 'error' };
      }
      this.cancelRequest$.next();
      return lastValueFrom(this.deploymentManagerApi.getDeployments(namespace, cu_id).pipe(takeUntil(this.cancelRequest$)));
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when fetching config", type: 'error' };
    }
  }
  async uploadKubeconfig(cu_id: string, file: File): Promise<ApiResponse> {
    try {
      if (!cu_id) {
        return { message: "No customer ID found", type: 'error' };
      }
      const formData = new FormData();
      formData.append('kubeconfig', file, file.name);
      const apiResponse = await lastValueFrom(this.deploymentManagerApi.uploadKubeconfig(cu_id, formData));
      return apiResponse;
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when uploading kubeconfig", type: 'error' };
    }
  }
  async downloadSetupScript(): Promise<ApiResponse> {
    try {
      const blobSH = await lastValueFrom(this.deploymentManagerApi.downloadSetupScriptSH());
      const blobBAT = await lastValueFrom(this.deploymentManagerApi.downloadSetupScriptBAT());
      
      const urlSH = window.URL.createObjectURL(blobSH);
      const aSH = document.createElement('a');
      aSH.href = urlSH;
      aSH.download = 'install.sh';
      aSH.click();
      window.URL.revokeObjectURL(urlSH);

      const urlBAT = window.URL.createObjectURL(blobBAT);
      const aBAT = document.createElement('a');
      aBAT.href = urlBAT;
      aBAT.download = 'install.bat';
      aBAT.click();
      window.URL.revokeObjectURL(urlBAT);

      return { message: 'Successful download', type: 'success' };
    } catch(e: any) {
      return { message: "Error when downloading setup script", type: 'error' };
    }
  }
  async installCADForApp(cu_id: string, namespace: string, deploymentName: string): Promise<ApiResponse> {
    try {
      if (!cu_id) {
        return { message: "No customer ID found", type: 'error' };
      }
      const apiResponse = await lastValueFrom(this.deploymentManagerApi.installCADForApp(cu_id, namespace, deploymentName));
      return apiResponse;
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when installing CAD for app", type: 'error' };
    }
  }
}
