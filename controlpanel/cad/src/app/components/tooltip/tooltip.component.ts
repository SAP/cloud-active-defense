import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
    selector: 'app-tooltip',
    imports: [CommonModule],
    templateUrl: './tooltip.component.html',
    styleUrl: './tooltip.component.scss'
})
export class TooltipComponent {
  @Input() showTooltip = true;
  @Input() title = 'Default title'
  @Input() text = 'Default tooltip text';
  @Input() topPosition = 215;
  @Input() leftPosition = 400;
  @Input() link = ''
  @Output() tooltipHover = new EventEmitter<boolean>();
  @Output() tooltipLeave = new EventEmitter<boolean>();

  constructor(){}
  onTooltipHover() {
    this.tooltipHover.emit(true);
  }

  onTooltipLeave() {
    this.tooltipLeave.emit(true);
  }
}
