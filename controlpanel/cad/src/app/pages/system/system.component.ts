import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Deployment, DeploymentManagerService } from '../../services/deployment-manager.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';
import { AppListService } from '../../services/app-list.service';

@Component({
  selector: 'app-system',
  imports: [CommonModule, FormsModule],
  templateUrl: './system.component.html',
  styleUrl: './system.component.scss'
})
export class SystemComponent {
  namespaces: string[] = [];
  deployments: Deployment[] = [];
  selectedNamespace: string = '';
  deploymentsLoading: boolean = true;
  namespacesLoading: boolean = false;
  deploymentManagerError: boolean = false;

  constructor(private deploymentManagerService: DeploymentManagerService, private toastr: ToastrService, private route: ActivatedRoute, private applistService: AppListService) { }
  
  async ngOnInit() {
    await this.fetchNamespaces();
  }

  async onNamespaceSelect() {
    this.deployments = [];
    this.deploymentsLoading = true;
    const deploymentApiResponse = await this.deploymentManagerService.getDeployments(this.selectedNamespace)
      if (deploymentApiResponse.type == 'error') this.toastr.error(deploymentApiResponse.message, 'Error')
      else this.deployments = deploymentApiResponse.data as Deployment[];
      this.deploymentsLoading = false;
  }
  onKubeconfigUpload(fileInput: HTMLInputElement) {
    this.namespaces = [];
    this.deployments = [];
    fileInput.click();

    fileInput.onchange = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const selectedFile = input.files[0];
        const validExtensions = ['.yaml', '.yml'];
        const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
          this.toastr.error('Please select a valid YAML file.', 'Error');
          return;
        } 
        const kubeconfigApiResponse = await this.deploymentManagerService.uploadKubeconfig(selectedFile)
        if (kubeconfigApiResponse.type == 'error') this.toastr.error(kubeconfigApiResponse.message, 'Error')
        else {
          this.deploymentManagerError = false;
          this.fetchNamespaces();
          this.toastr.success(kubeconfigApiResponse.message, 'Success')
        }
      }
    }
  }
  downloadSetupScript() {
    this.deploymentManagerService.downloadSetupScript();
  }
  async onSwitchChange(event: Event, deployment: Deployment) {
    event.preventDefault();
    if (deployment.disableSwitch) return;
    if (deployment.loadingInstall) return;
    deployment.disableSwitch = true
    setTimeout(() => {
      deployment.loadingInstall = true;
    }, 400);

    if (deployment.protected) {
      deployment.protected = false;
      const installApiResponse = await this.deploymentManagerService.uninstallCADForApp(this.selectedNamespace, deployment.name)
      if (installApiResponse.type == 'error') {
        deployment.protected = true
        this.toastr.error(installApiResponse.message, 'Error')
      }
      else {
        this.toastr.success(installApiResponse.message, 'Success')
        const applistResponse = await this.applistService.getAppList();
        if (applistResponse.type == 'error') this.toastr.error(applistResponse.message, 'Error');
      }
    } else {
      deployment.protected = true;
      const installApiResponse = await this.deploymentManagerService.installCADForApp(this.selectedNamespace, deployment.name)
      if (installApiResponse.type == 'error') {
        deployment.protected = false
        this.toastr.error(installApiResponse.message, 'Error')
      }
      else {
        this.toastr.success(installApiResponse.message, 'Success')
        const applistResponse = await this.applistService.getAppList();
        if (applistResponse.type == 'error') this.toastr.error(applistResponse.message, 'Error');
      }
    }
    deployment.loadingInstall = false;
    deployment.disableSwitch = false;
  }

  async fetchNamespaces() {
    this.namespacesLoading = true;
    const namespaceApiResponse = await this.deploymentManagerService.getNamespaces(); 
    if (namespaceApiResponse.type == 'error') {
      this.deploymentManagerError = true;
      this.toastr.error(namespaceApiResponse.message, 'Error')
    }
    else {
      this.namespaces = namespaceApiResponse.data as string[];
      if (this.namespaces.find(ns=>ns=='default')) {
        this.selectedNamespace = 'default';
        this.onNamespaceSelect();
      }
    }
    this.namespacesLoading = false;
  }

  async cleanCluster() {
    if (!confirm('Are you sure you want to clean the cluster? This will delete all necessary resources for Cloud Active Defense in your cluster and decoys in every namespaces')) return;
    const cleanApiResponse = await this.deploymentManagerService.cleanCluster();
    if (cleanApiResponse.type == 'error') {
      this.toastr.error(cleanApiResponse.message, 'Error');
    } else {
      this.toastr.success(cleanApiResponse.message, 'Success');
      this.fetchNamespaces();
      const applistResponse = await this.applistService.getAppList();
      if (applistResponse.type == 'error') this.toastr.error(applistResponse.message, 'Error');
    }
  }
}
