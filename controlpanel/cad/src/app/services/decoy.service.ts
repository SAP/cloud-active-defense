import { Injectable } from '@angular/core';
import { Decoy } from '../models/decoy';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DecoyService {
  decoys: Decoy[] = [];
  
  private decoySubject = new BehaviorSubject<Decoy>({decoy:{}});
  decoy$ = this.decoySubject.asObservable();


  constructor() { }

  addNewDecoy(decoy: Decoy) {
    if (!decoy) return;
    this.decoys.push(decoy);
  }
  get decoy(): Decoy {
    return this.decoySubject.value;
  }
  updateDecoy(newDecoy: Decoy) {
    this.decoySubject.next(newDecoy);
  }
  getDecoys() {
    // TODO api
    return this.decoys;
  }
  setDecoys(decoys: Decoy[]) {
    // TODO api
    this.decoys = decoys;
  }
}