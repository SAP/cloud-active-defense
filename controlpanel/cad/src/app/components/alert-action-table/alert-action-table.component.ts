import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, Input, OnInit, Output } from '@angular/core';
import { SourceSelectComponent } from '../source-select/source-select.component';
import { DelayType, DurationType, RespondType } from '../../models/decoy';
import { FormsModule } from '@angular/forms';
import { OnlyNumbersDirective } from '../../directives/only-numbers.directive';
import { OnlyValidRespondPropertyDirective } from '../../directives/only-valid-respond-property.directive';

export interface FormRespond extends RespondType {
  delayExtension: 's' | 'm' | 'h' | 'now',
  durationExtension: 's' | 'm' | 'h' | 'forever'
}

@Component({
  selector: 'app-alert-action-table',
  standalone: true,
  imports: [CommonModule, SourceSelectComponent, FormsModule, OnlyNumbersDirective, OnlyValidRespondPropertyDirective],
  templateUrl: './alert-action-table.component.html',
  styleUrl: './alert-action-table.component.scss'
})
export class AlertActionTableComponent {
  @Input() actionArray: FormRespond[] = [];
  @Output() actionArrayChange = new EventEmitter<FormRespond[]>();
  @Input() isEdit = true;

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
  onDurationExtensionChange(newExtension: 's' | 'm' | 'h' | 'forever', index: number) {
    if (newExtension == 'forever') this.actionArray[index].duration = 'forever';
    else if (this.actionArray[index].duration == 'forever') this.actionArray[index].duration = undefined;
  }

  sourceToArray(source: string) {
    return source !== '' ? source.split(',') : [];
  }
}
