import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiResponse } from '../../models/api-response';
import { GlobalStateService } from '../global-state.service';

@Injectable({
  providedIn: 'root'
})
export class DeploymentManagerApiService {

  constructor(private http: HttpClient, private globalState: GlobalStateService) { }

  getNamespaces(cu_id: string) {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/deployment-manager/namespaces/${cu_id}`);
  }
  getDeployments(namespace: string, cu_id: string) {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/deployment-manager/deployments/${cu_id}/${namespace}`);
  }
  uploadKubeconfig(cu_id: string, file: FormData) {
    return this.http.post<ApiResponse>(`${this.globalState.API_URL}/customer/${cu_id}/upload-kubeconfig`, file);
  }
  downloadSetupScriptSH() {
    return this.http.get(`https://raw.githubusercontent.com/SAP/cloud-active-defense/refs/heads/main/kyma/wizard.sh`, { responseType: 'blob' });
  }
  downloadSetupScriptBAT() {
    return this.http.get(`https://raw.githubusercontent.com/SAP/cloud-active-defense/refs/heads/main/kyma/wizard.bat`, { responseType: 'blob' });
  }
  installCADForApp(cu_id: string, namespace: string, deploymentName: string) {
    return this.http.post<ApiResponse>(`${this.globalState.API_URL}/deployment-manager/install/${cu_id}`, {deploymentAppName: deploymentName, namespace});
  }
}
