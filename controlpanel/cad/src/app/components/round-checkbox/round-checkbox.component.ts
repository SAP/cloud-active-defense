import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-round-checkbox',
  standalone: true,
  templateUrl: './round-checkbox.component.html',
  styleUrls: ['./round-checkbox.component.scss']
})
export class RoundCheckboxComponent {
  @Input() value!: string;
  @Input() checked: boolean = false;
  @Output() checkedChange = new EventEmitter<void>();

  onSelect() {
    this.checkedChange.emit();
  }
}