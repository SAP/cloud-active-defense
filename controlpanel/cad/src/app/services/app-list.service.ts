import { Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { AppListApiService } from './api/app-list-api.service';
import { ProtectedApp } from '../models/protected-app';
import { ApiResponse } from '../models/api-response';

@Injectable({
  providedIn: 'root'
})
export class AppListService {

  private applistSubject = new BehaviorSubject<ProtectedApp[]>([]);
  applist$ = this.applistSubject.asObservable();

  constructor(private applistApi: AppListApiService) { }

  get applist(): ProtectedApp[] {
    return this.applistSubject?.value || [];
  }
  set applist(applist: ProtectedApp[]) {
    this.applistSubject.next(applist);
  }

  async getAppList(): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.applistApi.getAppList());
      if (apiResponse.type == 'success') this.applist = apiResponse.data as ProtectedApp[];
      return apiResponse;
    } catch (error) {
      return { type: 'error', message: 'Error when fetching app list' };
    }
  }
}
