import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiResponse } from '../../models/api-response';
import { GlobalStateService } from '../global-state.service';

@Injectable({
  providedIn: 'root'
})
export class DeploymentManagerApiService {

  constructor(private http: HttpClient, private globalState: GlobalStateService) { }

  getNamespaces() {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/deployment-manager/namespaces`);
  }
  getDeployments(namespace: string) {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/deployment-manager/deployments/${namespace}`);
  }
  uploadKubeconfig(file: FormData) {
    return this.http.post<ApiResponse>(`${this.globalState.API_URL}/customer/upload-kubeconfig`, file);
  }
  downloadSetupScriptSH() {
    return this.http.get(`https://raw.githubusercontent.com/SAP/cloud-active-defense/refs/heads/main/kyma/wizard.sh`, { responseType: 'blob' });
  }
  downloadSetupScriptBAT() {
    return this.http.get(`https://raw.githubusercontent.com/SAP/cloud-active-defense/refs/heads/main/kyma/wizard.bat`, { responseType: 'blob' });
  }
  installCADForApp(namespace: string, deploymentName: string) {
    return this.http.post<ApiResponse>(`${this.globalState.API_URL}/deployment-manager/install`, {deploymentAppName: deploymentName, namespace});
  }
}
