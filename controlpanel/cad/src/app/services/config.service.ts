import { Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { Config } from '../models/config';
import { UUID } from '../models/types';
import { ApiResponse } from '../models/api-response';
import { ConfigApiService } from './api/config-api.service'
import { ConfigData } from '../models/config-data';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private configSubject = new BehaviorSubject<Config>({});
  config$ = this.configSubject.asObservable();

  constructor(private configApi: ConfigApiService) { }

  get config(): Config {
    return this.configSubject.value;
  }
  set config(v: Config) {
    this.configSubject.next(v);
  }

  async getConfig(pa_id: UUID): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.configApi.getConfig(pa_id));
      const configData = apiResponse.data as ConfigData
      this.config = configData.config || {};
      return apiResponse;
    } catch(e: any) {
      this.config = {};
      if (e.error) return e.error;
      else return { message: "Error when fetching config", type: 'error' };
    }
  }
  async updateConfig(configData: ConfigData): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.configApi.updateConfig(configData));
      return apiResponse;
    } catch(e: any) {
      if (e.error) return e.error;
      else return { message: "Error when updating config", type: 'error' };
    }
  }
}
