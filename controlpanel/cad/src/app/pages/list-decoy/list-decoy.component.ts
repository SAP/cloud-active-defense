import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Decoy } from '../../models/decoy';

@Component({
  selector: 'app-list-decoy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-decoy.component.html',
  styleUrl: './list-decoy.component.scss'
})
export class ListDecoyComponent {
  decoys: Decoy[] = [{
    "decoy": {
      "key": "x-cloud-active-defense",
      "separator": ":",
      "value": "ACTIVE",
      string: "qwertyuiop"
    },
    "inject": {
      "store": {
        "inResponse": ".*",
        "as": "header"
      }
    }
  },{
    "decoy": {
      "key": "x-cloud-active-defense",
      "separator": "=",
      "value": "ACTIVE",
      string: "qwertyuiop"
    },
    "inject": {
      "store": {
        "inResponse": ".*",
        "as": "header"
      }
    }
  } ];

  displayDecoy(decoy: Decoy): string {
    let key = decoy.decoy.dynamicKey || decoy.decoy.key || '';
    let value = decoy.decoy.dynamicValue || decoy.decoy.value || '';
    return `${key}${value ? decoy.decoy.separator ? decoy.decoy.separator : '=' : ''}${value}`;
  }
}
