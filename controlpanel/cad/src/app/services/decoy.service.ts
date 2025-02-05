import { Injectable } from '@angular/core';
import { Decoy } from '../models/decoy';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { DecoyApiService } from './api/decoy-api.service';
import { ApiResponse } from '../models/api-response';
import { GlobalStateService } from './global-state.service';
import { DecoyData } from '../models/decoy-data';
import { UUID } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class DecoyService {
  private decoySubject = new BehaviorSubject<Decoy>({decoy:{}});
  decoy$ = this.decoySubject.asObservable();

  private isEditSubject = new BehaviorSubject<boolean>(true);
  isEdit$ = this.isEditSubject.asObservable();

  constructor(private decoyApi: DecoyApiService, private globalState: GlobalStateService) { }

  async addNewDecoy(): Promise<ApiResponse> {
    if (!this.decoy) return { message: "No decoy provided", type: 'error' };
    try {
      const decoyData: DecoyData = {
        state: 'active',
        pa_id: this.globalState.selectedApp.id,
        deployed: false,
        decoy: this.decoy
      }
      return await lastValueFrom(this.decoyApi.postDecoy(decoyData));
    } catch(e) {
      console.error(e);
      return { message: "Error when adding the decoy", type: 'error' };
    }
  }
  get decoy(): Decoy {
    return this.decoySubject.value;
  }
  set decoy(v: Decoy) {
    this.decoySubject.next(v);
  }
  updateDecoy(newDecoy: Decoy) {
    this.decoySubject.next(newDecoy);
  }
  async getDecoy(id: UUID): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.decoyApi.getDecoy(id));
      const decoyData = apiResponse.data as DecoyData
      if (apiResponse.type == 'success') this.updateDecoy(decoyData.decoy);
      return apiResponse;
    } catch(e) {
      return { message: "Error when fetching decoy", type: 'error' };
    }
  }
  async deleteDecoy(id: UUID): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.decoyApi.deleteDecoy(id));
      return apiResponse;
    } catch(e) {
      return { message: "Error when deleting decoy", type: 'error' };
    }
  }
  async saveDecoy(decoyId: UUID, decoy: Decoy): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.decoyApi.putDecoy(decoyId, decoy));
      return apiResponse;
    } catch(e) {
      return { message: "Error when saving decoy", type: 'error' };
    }
  }
  async updateDecoyState(decoy: DecoyData): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.decoyApi.patchDecoyState(decoy));
      return apiResponse;
    } catch(e) {
      return { message: "Error when saving decoy", type: 'error' };
    }
  }

  async getDecoys(): Promise<ApiResponse> {
    try {
      return await lastValueFrom(this.decoyApi.getDecoys(this.globalState.selectedApp));
    } catch (e: any) {
      console.error(e)
      if (e.error.type) return { message: e.error.message, type: e.error.type };
      return { message: "Error when fetching decoys list", type: 'error' };
    }
  }

  get isEdit(): boolean {
    return this.isEditSubject.value;
  }
  set isEdit(v: boolean) {
    this.isEditSubject.next(v);
  }
}