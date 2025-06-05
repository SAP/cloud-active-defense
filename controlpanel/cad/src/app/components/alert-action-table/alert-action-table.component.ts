import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, Input, OnInit, Output } from '@angular/core';
import { SourceSelectComponent } from '../source-select/source-select.component';
import { DelayType, DurationType, RespondType } from '../../models/decoy';
import { FormsModule } from '@angular/forms';
import { OnlyNumbersDirective } from '../../directives/only-numbers.directive';
import { OnlyValidRespondPropertyDirective } from '../../directives/only-valid-respond-property.directive';
import { TooltipComponent } from '../tooltip/tooltip.component';

export interface FormRespond extends RespondType {
  delayExtension: 's' | 'm' | 'h' | 'now',
  durationExtension: 's' | 'm' | 'h' | 'forever' | 'default',
  formDuration?: DurationType | number | undefined
}

@Component({
    selector: 'app-alert-action-table',
    imports: [CommonModule, SourceSelectComponent, FormsModule, OnlyNumbersDirective, OnlyValidRespondPropertyDirective, TooltipComponent],
    templateUrl: './alert-action-table.component.html',
    styleUrl: './alert-action-table.component.scss'
})
export class AlertActionTableComponent {
  @Input() actionArray: FormRespond[] = [];
  @Output() actionArrayChange = new EventEmitter<FormRespond[]>();
  @Input() isEdit = true;

  //#region Tooltip
  tooltipTitle = '';
  showTooltip = false;
  tooltipText = '';
  tooltipLink = '';
  topPosition: any;
  leftPosition: any;
  tooltipTimeout:any;

  onHoverInfo(tooltipTitle?: string, tooltipText?: string, tooltipLink?: string, e?: MouseEvent) {
    clearTimeout(this.tooltipTimeout);
    this.showTooltip = true;
    if (tooltipTitle) this.tooltipTitle = tooltipTitle;
    if (tooltipText) this.tooltipText = tooltipText;
    if (tooltipLink) this.tooltipLink = tooltipLink;
    if (e) {
      this.topPosition = e.clientY ?? this.topPosition;
      this.leftPosition = e.clientX ?? this.leftPosition;
    }
  }
  onLeaveInfo() {
    this.tooltipTimeout = setTimeout(() => {
      this.showTooltip = false;
      this.tooltipText = '';
      this.topPosition = null;
      this.leftPosition = null;
    }, 100)
  }
//#endregion


  onClickAddAction() {
    this.actionArray.push({ source: '', behavior: 'error', delayExtension: 's', durationExtension: 's' });
    this.actionArrayChange.emit(this.actionArray);
  }

  onClickDeleteAction(index: number) {
    this.actionArray.splice(index, 1);
    this.actionArrayChange.emit(this.actionArray);
  }

  onItemChange() {
    this.actionArrayChange.emit(this.actionArray);
  }

  onSourceChange(newSource: string[], index: number) {
    if (!newSource) return;
    if (!this.actionArray) return;
    this.actionArray[index].source = newSource.join(',');
    this.onItemChange();
  }
  onDelayExtensionChange(newExtension: 's' | 'm' | 'h' | 'now', index: number) {
    if (newExtension == 'now') this.actionArray[index].delay = 'now';
    else if (this.actionArray[index].delay == 'now') this.actionArray[index].delay = undefined;
  }
  onDurationExtensionChange(newExtension: 's' | 'm' | 'h' | 'default' | 'forever', index: number) {
    if (newExtension == 'default') {
      if (this.actionArray[index].source.includes('userAgent')) {
        this.actionArray[index].durationExtension = 'h';
        this.actionArray[index].formDuration = 720;
      }
      else if (this.actionArray[index].source.includes('ip')) {
        this.actionArray[index].durationExtension = 'h';
        this.actionArray[index].formDuration = 48;
      }
      else if (this.actionArray[index].source.includes('session')) {
        this.actionArray[index].durationExtension = 'h';
        this.actionArray[index].formDuration = 24;
      }
      else {
        this.actionArray[index].durationExtension = 'h';
        this.actionArray[index].formDuration = 720;
      }
    }
    if (newExtension == 'forever') this.actionArray[index].formDuration = 'forever';
    else if (this.actionArray[index].formDuration == 'forever') this.actionArray[index].formDuration = undefined;
  }

  sourceToArray(source: string) {
    return source !== '' ? source.split(',') : [];
  }
}
