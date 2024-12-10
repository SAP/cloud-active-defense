import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppListService } from '../../services/api/app-list.service';
import { ToastrService } from 'ngx-toastr';
import { GlobalStateService } from '../../services/global-state.service';
import { isProtectedAppEmpty, ProtectedApp } from '../../models/protected-app';
import { DecoyService } from '../../services/decoy.service';



@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit{
  showDecoysSubMenu = false;
  showSettingsSubMenu = false;

  showSubAppSelector = false;
  applist: ProtectedApp[] = [];
  selectedApp: ProtectedApp = { id: '', namespace: '', application: '' };

  constructor(private applistService: AppListService, private toastr: ToastrService, private globalState: GlobalStateService, private decoyService: DecoyService) { }

  async ngOnInit() {
    const response = await this.applistService.getAppList();
    if (response.type == 'error') this.toastr.error(response.message, 'Error fetching data');
    else {
      this.applist = response.data as ProtectedApp[];
    }

    this.globalState.selectedApp$.subscribe(data => {
        this.selectedApp = data;
        this.updateSelectedApp(this.selectedApp);
        // Reset decoy
        this.decoyService.updateDecoy({decoy: {}});
    });
  }
  updateSelectedApp(app: ProtectedApp) {
    if (app === this.globalState.selectedApp && !isProtectedAppEmpty(app)) return;
    if (this.applist.length) {
      if (isProtectedAppEmpty(app)) this.selectedApp = this.applist[0];
      else this.globalState.selectedApp = app;
    }
  }
}