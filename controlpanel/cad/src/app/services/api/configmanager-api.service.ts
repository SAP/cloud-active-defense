import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiResponse } from '../../models/api-response';
import { GlobalStateService } from '../global-state.service';
import { Config } from '../../models/config';
import { UUID } from '../../models/types';

@Injectable({
  providedIn: 'root'
})
export class ConfigmanagerApiService {

  constructor(private http: HttpClient, private globalState: GlobalStateService) { }

  async updateConfigmanagerDecoys(pa_id: UUID) {
    try {
      return await lastValueFrom(this.http.put<ApiResponse>(`${this.globalState.API_URL}/configmanager/decoys/${pa_id}`, ''));
    } catch (e: any) {
      console.error(e);
      if (e.error.type == 'warning') return { message: e.error.message, type: 'warning' };
      return { message: 'Cannot synchronize decoys with configmanager', type: 'error' };
    }
  }
  async updateConfigmanagerConfig(pa_id: UUID) {
    try {
      return await lastValueFrom(this.http.put<ApiResponse>(`${this.globalState.API_URL}/configmanager/config/${pa_id}`, ''));
    } catch (e) {
      console.error(e);
      return { message: 'Cannot synchronize config with configmanager', type: 'error' };
    }
  }
}
