import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GlobalStateService } from '../global-state.service';
import { ApiResponse } from '../../models/api-response';

@Injectable({
  providedIn: 'root'
})
export class AppListApiService {

  constructor(private http: HttpClient, private globalState: GlobalStateService) { }

  getAppList() {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/protected-app`);
  }
}
