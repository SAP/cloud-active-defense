import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {

  keycloak?: Keycloak;

  constructor() { }

  async connectToKeycloak() {
    try {
      this.keycloak = new Keycloak({
        url: environment.KEYCLOAK_URL,
        realm: "cad",
        clientId: "cad",
      });
      const authenticated = await this.keycloak.init({
        onLoad: "login-required",
      });
      if (!authenticated) {
        console.error("Keycloak authentication failed");
        return;
      }
      this.keycloak.onTokenExpired = () => {
        this.keycloak?.updateToken().catch(() => {
          console.error("Failed to refresh Keycloak token");
        });
      }
    } catch (error) {
        console.error("Keycloak initialization failed", error);
    }
  }
}
