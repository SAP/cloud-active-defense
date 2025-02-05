import { Injectable } from '@angular/core';
import { ProtectedApp } from '../models/protected-app';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {

  private selectedAppSubject = new BehaviorSubject<ProtectedApp>(this.selectedApp);
  selectedApp$ = this.selectedAppSubject.asObservable();
  readonly API_URL = 'http://localhost:8050'; // http://controlpanel-api:8050

  get selectedApp(): ProtectedApp {
    const local = localStorage.getItem('protectedApp');
    return this.selectedAppSubject?.value || (local && JSON.parse(local)) || {};
  }
  set selectedApp(protectedApp: ProtectedApp) {
    this.selectedAppSubject.next(protectedApp);
    localStorage.setItem('protectedApp', JSON.stringify(protectedApp));
  }
}
