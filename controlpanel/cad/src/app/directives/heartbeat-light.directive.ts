import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { ProtectedApp } from '../models/protected-app';
import { AppListService } from '../services/app-list.service';

@Directive({
  selector: '[appHeartbeatLight]',
  standalone: true
})
export class HeartbeatLightDirective implements OnInit {

  @Input() protectedApp: ProtectedApp = { id: '', namespace: '', application: '', lastConfigTime: null };

  constructor(private el: ElementRef) { }

  ngOnInit() {
    const fifteenMinutesAgo = Date.now() - 1 * 60 * 1000; // 15 minutes ago as timestamp
    const sixtyMinutesAgo = Date.now() - 2 * 60 * 1000; // 60 minutes ago as timestamp

    if (Number(this.protectedApp.lastConfigTime!) < sixtyMinutesAgo) {
        this.el.nativeElement.classList.add('red-light'); // Older than 60 minutes
    } else if (Number(this.protectedApp.lastConfigTime!) < fifteenMinutesAgo) {
        this.el.nativeElement.classList.add('yellow-light'); // Between 16 and 60 minutes
    } else {
        this.el.nativeElement.classList.add('green-light'); // Less than 15 minutes
    }

  }
}
