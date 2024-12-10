import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GlobalStateService } from '../global-state.service';
import { ApiResponse } from '../../models/api-response';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppListService {

  constructor(private http: HttpClient, private globalState: GlobalStateService) { }

  async getAppList(): Promise<ApiResponse> {
    try {
      return await lastValueFrom(this.http.get<ApiResponse>(`${this.globalState.API_URL}/protected-app`));
    } catch (e) {
      console.error(e);
      return { message: 'Cannot fetch app list data from API', type: 'error' };
    }
  }
}
