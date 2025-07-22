import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';
import { KeycloakService } from './services/keycloak.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, MenuComponent, CommonModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  isReady = false

  constructor(private keycloakService: KeycloakService) { }

  async ngOnInit() {
    await this.keycloakService.connectToKeycloak();
    this.isReady = true;
  }
}
