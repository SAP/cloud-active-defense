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
  private decoySubject = new BehaviorSubject<Decoy | null>(null);
  decoy$ = this.decoySubject.asObservable();

  private isEditSubject = new BehaviorSubject<boolean>(true);
  isEdit$ = this.isEditSubject.asObservable();

  constructor(private decoyApi: DecoyApiService, private globalState: GlobalStateService) { }

  async addNewDecoy(): Promise<ApiResponse> {
    if (!this.decoy) return { message: "No decoy provided", type: 'error' };
    try {
      const decoyData: DecoyData = {
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
  get decoy(): Decoy | null {
    return this.decoySubject.value;
  }
  set decoy(v: Decoy) {
    this.decoySubject.next(v);
  }
  updateDecoy(newDecoy: Decoy | null) {
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
  async updateDecoyDeployState(decoy: DecoyData): Promise<ApiResponse> {
    try {
      const apiResponse = await lastValueFrom(this.decoyApi.patchDecoyDeployState(decoy));
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
  async uploadDecoys(file: File): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('decoys', file, file.name);
      const result = await lastValueFrom(this.decoyApi.uploadDecoys(this.globalState.selectedApp, formData));

      return result;
    } catch (e: any) {
      if (e.error.type) {
        if (e.error.type === 'error' && e.error.action === 'download') {
          try {
            const blob = await lastValueFrom(this.decoyApi.downloadErrorDecoys(e.error.data as string))
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = e.error.data as string;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } catch (downloadError) {
            console.error("Error downloading file:", downloadError);
          }
        }
        return { message: e.error.message, type: e.error.type };
      }
      return { message: "Error when uploading decoys", type: 'error' };
    }
  }

  get isEdit(): boolean {
    return this.isEditSubject.value;
  }
  set isEdit(v: boolean) {
    this.isEditSubject.next(v);
  }
}