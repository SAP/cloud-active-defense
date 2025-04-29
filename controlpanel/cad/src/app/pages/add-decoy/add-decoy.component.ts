import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { DecoyService } from '../../services/decoy.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface Tab { 
  name: string,
  path: string
}

@Component({
    selector: 'app-add-decoy',
    imports: [RouterOutlet, CommonModule, RouterLink, FormsModule],
    templateUrl: './add-decoy.component.html',
    styleUrl: './add-decoy.component.scss'
})
export class AddDecoyComponent implements OnInit, OnDestroy {
  tabs: Tab[] = [
    {
      name: 'Injection',
      path: './injection'
    },
    {
      name: 'Detection',
      path: './detection'
    },
    {
      name: 'Alert & Action',
      path: './alert-action'
    },
    {
      name: 'Review',
      path: './review'
    }
  ]
  activeIndex: number = 0;
  isEdit = true;
  navigationSubscription?: Subscription;
  routeParamSubscription?: Subscription

  constructor(private router: Router, private activatedRoute: ActivatedRoute, private decoyService: DecoyService, private toastr: ToastrService){}

  ngOnInit() {
    // Listen for router events and update the activeIndex
     this.navigationSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateActiveIndex();
      }
    });
    // Initialize the active index when the component loads
    this.updateActiveIndex();
    
    this.routeParamSubscription = this.activatedRoute.params.subscribe(async params => {
      const decoyId = params['id'];
      if (decoyId) {
        this.decoyService.isEdit = false;
        this.isEdit = false;
        const apiResponse = await this.decoyService.getDecoy(decoyId);
        if (apiResponse.type == 'error') this.toastr.error(apiResponse.message, "Error");
      } else {
        this.decoyService.isEdit = true;
        this.isEdit = true;
        this.decoyService.decoy = {decoy:{}};
      }
    });
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
    this.routeParamSubscription?.unsubscribe();
  }

  updateActiveIndex() {
    const splitedUrl = this.router.url.split('/');
    const currentUrl = './' + splitedUrl[splitedUrl.length - 1]
    this.activeIndex = this.tabs.findIndex(tab => currentUrl.includes(tab.path));
  }
  updateEditStatus() {
    this.isEdit = !this.decoyService.isEdit;
    this.decoyService.isEdit = !this.decoyService.isEdit;
  }
}
