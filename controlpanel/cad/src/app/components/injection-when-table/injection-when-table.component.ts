import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WhenType } from '../../models/decoy';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { CustomValidators } from '../../validators/customValidators';


export interface FormWhen extends WhenType{
  type: boolean
}

@Component({
  selector: 'app-injection-when-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './injection-when-table.component.html',
  styleUrl: './injection-when-table.component.scss'
})
export class InjectionWhenTableComponent {
  @Input() whenArray: FormWhen[] = [{ key:'', value: '', in: 'cookie', type: true }];
  @Output() whenArrayChange = new EventEmitter<FormWhen[]>();
  validWhenArray = true;
  @Input() isEdit = true;
  
  onClickAddWhen(){
    this.whenArray.push({ key:'', value:'', in: 'cookie', type: true });
    this.whenArrayChange.emit(this.whenArray);
  }

  onClickDeleteWhen(index: number){
    this.whenArray.splice(index, 1);
    this.whenArrayChange.emit(this.whenArray);
  }

  onItemChange(){
    this.whenArrayChange.emit(this.whenArray);
  }
}
