import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GlobalStateService } from '../global-state.service';
import { ApiResponse } from '../../models/api-response';
import { UUID } from '../../models/types';

@Injectable({
  providedIn: 'root'
})
export class LogsApiService {

  constructor(private http: HttpClient, private globalState: GlobalStateService) { }

  getLogs(pa_id: UUID, query: string) {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/logs/${pa_id}${query}`);
  }
}
