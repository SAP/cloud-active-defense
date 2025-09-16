import { Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { AppListApiService } from './api/app-list-api.service';
import { ProtectedApp } from '../models/protected-app';
import { ApiResponse } from '../models/api-response';
import { GlobalStateService } from './global-state.service';

@Injectable({
  providedIn: 'root'
})
export class AppListService {

  private applistSubject = new BehaviorSubject<ProtectedApp[]>([]);
  applist$ = this.applistSubject.asObservable();

  constructor(private applistApi: AppListApiService, private globalState: GlobalStateService) { }

  get applist(): ProtectedApp[] {
    return this.applistSubject?.value || [];
  }
  set applist(applist: ProtectedApp[]) {
    this.applistSubject.next(applist);
  }

  async getAppList(): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.applistApi.getAppList());
      if (apiResponse.type == 'success') {
        this.applist = apiResponse.data as ProtectedApp[];
        const alreadySelectedApp = this.applist.find(app => app.id == this.globalState.selectedApp.id)
        if (!alreadySelectedApp) {
          const defaultApp = this.applist.find(app => app.namespace == 'default' && app.application == 'default');
          this.globalState.selectedApp = defaultApp || this.applist[0];
        } else this.globalState.selectedApp = alreadySelectedApp; // Update last selectedApp with the latest data
      }
      return apiResponse;
    } catch (error) {
      return { type: 'error', message: 'Error when fetching app list' };
    }
  }
}
