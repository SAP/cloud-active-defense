import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppListService } from '../../services/app-list.service';
import { ToastrService } from 'ngx-toastr';
import { GlobalStateService } from '../../services/global-state.service';
import { isProtectedAppEmpty, ProtectedApp } from '../../models/protected-app';
import { DecoyService } from '../../services/decoy.service';
import { isEmptyObject } from '../../utils';
import { KeycloakService } from '../../services/keycloak.service';
import { TooltipComponent } from '../tooltip/tooltip.component';



@Component({
    selector: 'app-menu',
    imports: [CommonModule, RouterLink, TooltipComponent],
    templateUrl: './menu.component.html',
    styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit{
  showDecoysSubMenu = false;
  showSettingsSubMenu = false;

  showSubAppSelector = false;
  applist: ProtectedApp[] = [];
  defaultApp: ProtectedApp = { id: '', namespace: '', application: '', lastConfigTime: null, lightColor: ''};
  selectedApp: ProtectedApp = { id: '', namespace: '', application: '', lastConfigTime: null, lightColor: '' };

  isProtectedAppEmpty = isProtectedAppEmpty;

  constructor(private applistService: AppListService, private toastr: ToastrService, private globalState: GlobalStateService, private decoyService: DecoyService, private keycloakService: KeycloakService) { }

//#region Tooltip
  tooltipTitle = '';
  showTooltip = false;
  tooltipText = '';
  tooltipLink = '';
  topPosition: any;
  leftPosition: any;
  tooltipTimeout:any;

  onHoverInfo(tooltipTitle?: string, tooltipText?: string, tooltipLink?: string, e?: MouseEvent) {
    clearTimeout(this.tooltipTimeout);
    this.showTooltip = true;
    if (tooltipTitle) this.tooltipTitle = tooltipTitle;
    if (tooltipText) this.tooltipText = tooltipText;
    if (tooltipLink) this.tooltipLink = tooltipLink;
    else this.tooltipLink = '';
    if (e) {
      this.topPosition = e.clientY ?? this.topPosition;
      this.leftPosition = e.clientX ?? this.leftPosition;
    }
  }
  onLeaveInfo() {
    this.tooltipTimeout = setTimeout(() => {
      this.showTooltip = false;
      this.tooltipText = '';
      this.topPosition = null;
      this.leftPosition = null;
    }, 100)
  }
//#endregion


  async ngOnInit() {
    const response = await this.applistService.getAppList();
    if (response.type == 'error') this.toastr.error(response.message, 'Error');

    this.applistService.applist$.subscribe(data => {
      this.defaultApp = data.filter(app => app.namespace == 'default' && app.application == 'default')[0] as ProtectedApp;
      this.applist = data.filter(app => app.namespace != 'default' && app.application != 'default');
    })

    this.globalState.selectedApp$.subscribe(data => {
      if (isEmptyObject(data) || !this.applist.find(app=>app.id == data.id) && this.defaultApp.id != data.id) this.selectedApp = this.defaultApp;
      else this.selectedApp = data;
        this.updateSelectedApp(this.selectedApp);
        // Reset decoy
        this.decoyService.updateDecoy({decoy: {}});
    });
  }
  updateSelectedApp(app: ProtectedApp) {
    if (app === this.globalState.selectedApp && !isProtectedAppEmpty(app)) return;
    else this.globalState.selectedApp = app;
  }
  logout() {
    this.keycloakService.keycloak?.logout();
  }
}
