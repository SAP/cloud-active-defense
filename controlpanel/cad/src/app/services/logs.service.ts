import { Injectable } from '@angular/core';
import { LogsApiService } from './api/logs-api.service';
import { lastValueFrom } from 'rxjs';
import { GlobalStateService } from './global-state.service';
import { ApiResponse } from '../models/api-response';

export interface LogFilter {
  [key: string]: { operator: string, value: string }
}

@Injectable({
  providedIn: 'root'
})
export class LogsService {

  constructor(private logsApi: LogsApiService, private globalState: GlobalStateService) { }

  async getLogsByApp(filter: LogFilter): Promise<ApiResponse> {
    try {
      const formattedFilter = Object.keys(filter).map(key => `${key}=${filter[key].operator ? filter[key].operator + ':' : ''}${filter[key].value}`);
      return await lastValueFrom(this.logsApi.getLogs(this.globalState.selectedApp.id, formattedFilter.length ? `?${formattedFilter.join('&')}` : ''));
    } catch (e: any) {
      console.error(e)
      if (e.error.type) return { message: e.error.message, type: e.error.type };
      return { message: "Error when fetching decoys list", type: 'error' };
    }
  }
}
