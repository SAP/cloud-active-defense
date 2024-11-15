import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

export interface Tab { 
  name: string,
  path: string
}

@Component({
  selector: 'app-add-decoy',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './add-decoy.component.html',
  styleUrl: './add-decoy.component.scss'
})
export class AddDecoyComponent {
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

  constructor(private router: Router){}

  ngOnInit() {
    // Listen for router events and update the activeIndex
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateActiveIndex();
      }
    });

    // Initialize the active index when the component loads
    this.updateActiveIndex();
  }

  updateActiveIndex() {
    const splitedUrl = this.router.url.split('/');
    const currentUrl = './' + splitedUrl[splitedUrl.length - 1]
    this.activeIndex = this.tabs.findIndex(tab => currentUrl.includes(tab.path));
  }
}
