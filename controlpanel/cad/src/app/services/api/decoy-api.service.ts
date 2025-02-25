import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Decoy } from '../../models/decoy';
import { ApiResponse } from '../../models/api-response';
import { GlobalStateService } from '../global-state.service';
import { ProtectedApp } from '../../models/protected-app';
import { UUID } from '../../models/types';
import { DecoyData } from '../../models/decoy-data';

@Injectable({
  providedIn: 'root',
})
export class DecoyApiService {

  constructor(private http: HttpClient, private globalState: GlobalStateService) { }

  getDecoys(protectedApp: ProtectedApp) {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/decoys/${protectedApp.id}`);
  }

  getDecoy(id: UUID) {
    return this.http.get<ApiResponse>(`${this.globalState.API_URL}/decoy/${id}`);
  }
  putDecoy(id: UUID, decoy: Decoy) {
    return this.http.put<ApiResponse>(`${this.globalState.API_URL}/decoy/${id}`, decoy);
  }
  postDecoy(decoy: DecoyData) {
    return this.http.post<ApiResponse>(`${this.globalState.API_URL}/decoy`, decoy);
  }
  deleteDecoy(id: UUID) {
    return this.http.delete<ApiResponse>(`${this.globalState.API_URL}/decoy/${id}`);
  }
  patchDecoyDeployState(decoy: DecoyData) {
    return this.http.patch<ApiResponse>(`${this.globalState.API_URL}/decoy/state`, decoy);
  }
}
