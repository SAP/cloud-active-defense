import { Injectable } from '@angular/core';
import { UUID } from '../../models/types';
import { HttpClient } from '@angular/common/http';
import { GlobalStateService } from '../global-state.service';
import { ApiResponse } from '../../models/api-response';
import { ConfigData } from '../../models/config-data';

@Injectable({
  providedIn: 'root'
})
export class ConfigApiService {

  constructor(private http: HttpClient, private globalState: GlobalStateService) { }
  
  getConfig(pa_id: UUID) {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/config/${pa_id}`);
  }

  updateConfig(configData: ConfigData) {
    return this.http.put<ApiResponse>(`${this.globalState.API_URL}/config`, configData);
  }
}
