import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TooltipComponent } from '../../../components/tooltip/tooltip.component';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Decoy, isInType, isRequestType, isVerbType, RequestType, VerbType, InType, isSeverityType, SeverityType, RespondType, DelayType, DurationType } from '../../../models/decoy';
import { DecoyService } from '../../../services/decoy.service';
import { WhenAlertSelectComponent } from '../../../components/when-alert-select/when-alert-select.component';
import { AlertActionTableComponent, FormRespond } from '../../../components/alert-action-table/alert-action-table.component';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ValidateDecoyFormDeactivate } from '../../../guards/deactivate/validate-decoy-form.guard';
import { CustomValidators } from '../../../validators/customValidators';

@Component({
  selector: 'app-alert-action',
  standalone: true,
  imports: [FormsModule, CommonModule, TooltipComponent, ReactiveFormsModule, RouterOutlet, WhenAlertSelectComponent, AlertActionTableComponent],
  templateUrl: './alert-action.component.html',
  styleUrl: './alert-action.component.scss'
})
export class AlertActionComponent implements OnInit, ValidateDecoyFormDeactivate {
  alertForm: FormGroup
  decoy: Decoy = {decoy:{key:'', value:''}};
  whenArray: string[] = [];
  actionArray: FormRespond[] = [];

  isUpdating = false;
  whenSelectTouched = false;
  validRespond = false;
  actionTouched = false;

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

  constructor(private decoyService: DecoyService, private router: Router, private activatedRoute: ActivatedRoute, private toastr: ToastrService){
    this.alertForm = new FormGroup({
      severity: new FormControl('LOW', [Validators.required]),
    })
  }
  validateDecoyForm(nextRoute: string): Observable<boolean> | Promise<boolean> | boolean {
    if (nextRoute.includes('injection') || nextRoute.includes('detection')) return true;
    if (nextRoute.includes('review')) {
      this.alertForm.markAllAsTouched();
      this.whenSelectTouched = true;
      this.validRespond = CustomValidators.isValidRespond(this.actionArray);

      if (this.alertForm.invalid || !this.hasOneWhenAlert() || !this.validRespond) {
        this.toastr.warning("Some fields are missing or are incorrect, cannot leave page", 'Form incomplete');
        return false
      }
      return true
    }
    return confirm("Are you sure to leave this page ? All progress will be lost");
  }

  ngOnInit(): void {
    this.decoyService.decoy$.subscribe(data => {
      if (!this.isUpdating){
        this.isUpdating = true
        this.decoy = data;
        if (!this.decoy.detect) this.router.navigate(['../detection'], { relativeTo: this.activatedRoute });
        this.fillForm(data);
        this.isUpdating = false;
      }
    })

    this.alertForm.get('severity')?.valueChanges.subscribe(newSeverity => {
      this.onSeverityChange(newSeverity);
    })
  }

  onWhenChange(newWhen: string[]) {
    if (!newWhen) return;
    if (!this.decoy.detect) this.decoy.detect = { seek : { in: 'header' }};
    if (!this.decoy.detect.alert) this.decoy.detect.alert = { severity: this.alertForm.get('severity')?.value };
    if (newWhen.includes('whenModified')) this.decoy.detect.alert.whenModified = true;
    else this.decoy.detect.alert.whenModified = false;
    if (newWhen.includes('whenComplete')) this.decoy.detect.alert.whenComplete = true;
    else this.decoy.detect.alert.whenComplete = false;
    if (newWhen.includes('whenSeen')) this.decoy.detect.alert.whenSeen = true;
    else this.decoy.detect.alert.whenSeen = false;
    if (newWhen.includes('whenAbsent')) this.decoy.detect.alert.whenAbsent = true;
    else this.decoy.detect.alert.whenAbsent = false;
  }
  onSeverityChange(newSeverity: SeverityType) {
    if (!isSeverityType(newSeverity)) return;
    if (!this.decoy.detect) this.decoy.detect = { seek: { in: 'header' }};
    if (!this.decoy.detect.alert) this.decoy.detect.alert = { severity: 'LOW' };
    this.decoy.detect.alert.severity = newSeverity;
  }
  onActionChange(newActions: FormRespond[]) {
    this.actionTouched = true;
    if (!newActions) return;
    if (!this.decoy.detect) this.decoy.detect = { seek : { in: 'header' }};
    if (!this.decoy.detect.alert) this.decoy.detect.alert = { severity: this.alertForm.get('severity')?.value };
    this.decoy.detect.respond = newActions.map(({ delayExtension, delay, durationExtension, duration, ...rest }) => {
      let newDelay = '';
      let newDuration = '';
      let newRespond: RespondType = rest;
      if (delayExtension !== 'now' && delayExtension !== undefined && delay !== undefined) {
        newDelay = delay + delayExtension;
      } else newDelay = 'now'
      if (durationExtension !== 'forever' && durationExtension !== undefined && duration !== undefined) {
        newDuration = duration + durationExtension;
      } else newDuration = 'forever'
      if (delay !== undefined) {
        newRespond.delay = newDelay as DelayType;
      }
      if (duration !== undefined) {
        newRespond.duration = newDuration as DurationType;
      }
      return newRespond;
    });
    this.validRespond = CustomValidators.isValidRespond(newActions);
  }
  hasOneWhenAlert() {
    return this.decoy.detect?.alert?.whenAbsent ||
          this.decoy.detect?.alert?.whenComplete ||
          this.decoy.detect?.alert?.whenModified ||
          this.decoy.detect?.alert?.whenSeen
  }

  fillForm(decoyData: Decoy){
    this.alertForm.setValue({
      severity: decoyData.detect?.alert?.severity || 'LOW',
    })

    if (this.decoy.detect?.alert?.whenAbsent) this.whenArray.push('whenAbsent');
    if (this.decoy.detect?.alert?.whenComplete) this.whenArray.push('whenComplete');
    if (this.decoy.detect?.alert?.whenModified) this.whenArray.push('whenModified');
    if (this.decoy.detect?.alert?.whenSeen) this.whenArray.push('whenSeen');

    if (this.decoy.detect?.respond) {
      this.actionArray = this.decoy.detect?.respond?.map(({ delay, duration, ...rest }) => {
        let newRespond: FormRespond = { ...rest, delayExtension: 's', durationExtension: 's' };
        if (delay == 'now') {
          newRespond.delay = delay;
          newRespond.delayExtension = 'now';
        }
        else {
          newRespond.delay = delay?.slice(0, -1) as DelayType
          newRespond.delayExtension = delay?.slice(-1) as 's' | 'm' | 'h';
        }
        
        if (duration == 'forever') {
          newRespond.duration == duration; 
          newRespond.durationExtension = 'forever';
        }
        else {
          newRespond.duration = delay?.slice(0, -1) as DurationType
          newRespond.durationExtension = delay?.slice(-1) as 's' | 'm' | 'h';
        }
        return newRespond;
      }) as FormRespond[];
    }
  }

  nextStep() {
    this.router.navigate(['../review'], {
      relativeTo: this.activatedRoute
    });
  }
}