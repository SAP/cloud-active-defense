import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TooltipComponent } from '../../../components/tooltip/tooltip.component';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Decoy, isInType, isRequestType, isVerbType, RequestType, VerbType, InType } from '../../../models/decoy';
import { DecoyService } from '../../../services/decoy.service';
import { CustomValidators } from '../../../validators/customValidators';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription } from 'rxjs';
import { ValidateDecoyFormDeactivate } from '../../../guards/deactivate/validate-decoy-form.guard';

@Component({
    selector: 'app-detection',
    imports: [FormsModule, CommonModule, TooltipComponent, ReactiveFormsModule, RouterLink],
    templateUrl: './detection.component.html',
    styleUrl: './detection.component.scss'
})
export class DetectionComponent implements OnInit, ValidateDecoyFormDeactivate, OnDestroy {
  detectionForm: FormGroup
  decoy: Decoy = {decoy:{key:'', value:''}};

  isUpdating = false;
  skip = false;
  keyRegexActive = false;
  valueRegexActive = false;
  isEdit = true;
  decoySubscription?: Subscription;
  isEditSubscription?: Subscription;

  // For reference
  regexValidator = CustomValidators.isRegexValid();

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
    this.detectionForm = new FormGroup({
      detectionPath: new FormControl('', [Validators.required, CustomValidators.isValidURL]),
      request: new FormControl('inRequest', [Validators.required]),
      verb: new FormControl(''),
      in: new FormControl('header', [Validators.required]),
      key: new FormControl('', [Validators.required]),
      separator: new FormControl(''),
      value: new FormControl(''),
    }, { validators: [CustomValidators.expectValueWithKey()] })
  }
  validateDecoyForm(nextRoute: string): Observable<boolean> | Promise<boolean> | boolean {
    if (nextRoute.includes('injection')) {
      if (this.decoy.detect && this.decoy.detect.seek && !this.decoy.detect.seek.inRequest && !this.decoy.detect.seek.inResponse && !this.decoy.detect.seek.withVerb) {
        delete this.decoy.detect;
      }
      return true;
    }
    if (nextRoute.includes('alert-action') || nextRoute.includes('review')) {
      if (this.skip) return true;
      this.detectionForm.markAllAsTouched();
  
      if (this.detectionForm.invalid) {
        this.toastr.warning("Some fields are missing or are incorrect, cannot leave page", 'Form incomplete');
        return false
      }
      if (!nextRoute.includes('alert-action') && !this.decoy.detect?.alert) {
        this.toastr.warning("Must fill the alert/action section to continue", 'Form incomplete')
        return false
      }
      return true
    }
    if (!this.detectionForm.dirty) return true;
    return confirm("Are you sure to leave this page ? All progress will be lost");
  }

  ngOnInit(): void {
    this.decoyService.decoy$.subscribe(data => {
      if (!this.isUpdating) {
        this.isUpdating = true
        this.decoy = data as Decoy;
        if (!this.decoy.detect) this.decoy.detect = { seek: { in: 'header' } };
        this.fillForm(this.decoy);
        this.isUpdating = false;
      }
    })

    this.decoyService.isEdit$.subscribe(data => {
      this.isEdit = data;
      this.updateIsEdit()
    });

    this.detectionForm.get('detectionPath')?.valueChanges.subscribe(newDetectionPath => {
      this.onDetectionPathChange(newDetectionPath);
    })
    this.detectionForm.get('request')?.valueChanges.subscribe(newRequest => {
      this.onRequestChange(newRequest);
    })
    this.detectionForm.get('verb')?.valueChanges.subscribe(newVerb => {
      this.onVerbChange(newVerb);
    })
    this.detectionForm.get('in')?.valueChanges.subscribe(newIn => {
      this.onInChange(newIn);
    })
    this.detectionForm.get('key')?.valueChanges.subscribe(newKey => {
      if (this.keyRegexActive) this.decoy.decoy.dynamicKey = newKey;
      else this.decoy.decoy.key = newKey;
    })
    this.detectionForm.get('separator')?.valueChanges.subscribe(newSeparator => {
      this.decoy.decoy.separator = newSeparator;
    })
    this.detectionForm.get('value')?.valueChanges.subscribe(newValue => {
      if (this.valueRegexActive) this.decoy.decoy.dynamicValue = newValue;
      else this.decoy.decoy.value = newValue
    })
  }

  ngOnDestroy(): void {
    this.decoySubscription?.unsubscribe();
    this.isEditSubscription?.unsubscribe();
  }
  
  get detectionPath() {
    return this.detectionForm.get('detectionPath') as FormControl;
  }
  get request(): RequestType {
    return this.detectionForm.get('request')?.value;
  }
  get key() {
    return this.detectionForm.get('key') as FormControl;
  }
  get value() {
    return this.detectionForm.get('value') as FormControl;
  }
  get in() { 
    return this.detectionForm.get('in') as FormControl;
  }

  onInChange(newIn: InType) {
    if (!isInType(newIn)) return;
    if (!this.decoy.detect) this.decoy.detect = { seek: { in: newIn }};
    this.decoy.detect.seek.in = newIn;
  }
  onRequestChange(newRequest: RequestType) {
    if (!isRequestType(newRequest)) return;
    if (!this.decoy.detect) this.decoy.detect = { seek: { in: 'header' } }
    if (newRequest !== 'inRequest') delete this.decoy.detect.seek['inRequest'];
    if (newRequest !== 'inResponse') delete this.decoy.detect.seek['inResponse'];
    this.decoy.detect.seek[newRequest] = this.detectionPath.value;
  }
  onDetectionPathChange(newDetectionPath: string) {
    if (!this.decoy.detect) this.decoy.detect = { seek: { in: 'header' } }
    if (this.request !== 'inRequest') delete this.decoy.detect.seek['inRequest'];
    if (this.request !== 'inResponse') delete this.decoy.detect.seek['inResponse'];
    this.decoy.detect.seek[this.request] = newDetectionPath;
  }
  onVerbChange(newVerb: VerbType) {
    if (!newVerb) { delete this.decoy.detect?.seek.withVerb; return }
    if (!isVerbType(newVerb)) return;
    if (!this.decoy.detect) this.decoy.detect = { seek: { in: 'header' } }
    this.decoy.detect.seek.withVerb = newVerb;
  }
  onRegexChange(inputName: string) {
    const control = this.detectionForm.get(inputName);
    if (inputName == 'key') {
      this.keyRegexActive = !this.keyRegexActive;
      if (this.keyRegexActive) {
        control?.addValidators(this.regexValidator);
        delete this.decoy.decoy.key;
      }
      else {
        control?.removeValidators(this.regexValidator);
        delete this.decoy.decoy.dynamicKey;
      }
    }
    if (inputName == 'value') {
      this.valueRegexActive = !this.valueRegexActive;
      if (this.valueRegexActive) {
        control?.addValidators(this.regexValidator);
        delete this.decoy.decoy.value;
      }
      else {
        control?.removeValidators(this.regexValidator);
        delete this.decoy.decoy.dynamicValue;
      }
    }
    control?.updateValueAndValidity();
  }

  fillForm(decoyData: Decoy){
    this.detectionForm.setValue({
      detectionPath: decoyData.detect?.seek.inRequest || decoyData.detect?.seek.inResponse || '',
      request: decoyData.detect?.seek.inResponse != undefined ? 'inResponse' : 'inRequest',
      verb: decoyData.detect?.seek.withVerb || '',
      in: decoyData.detect?.seek.in || 'header',
      key: decoyData.decoy.key || decoyData.decoy.dynamicKey || '',
      separator: decoyData.decoy.separator || '',
      value: decoyData.decoy.value || decoyData.decoy.dynamicValue || '',
    })
    if (decoyData.decoy.dynamicKey) this.onRegexChange('key');
    if (decoyData.decoy.dynamicValue) this.onRegexChange('value');
  }

  skipDetection() {
    if (!this.decoy.inject) {
      this.toastr.warning("Cannot skip detection if injection was also skipped, need at least inject or detect", 'Cannot skip detection')
      return;
    }
    this.skip = true;
    delete this.decoy.detect
    this.router.navigate(['../review'], {
      relativeTo: this.activatedRoute
    })
  }

  updateIsEdit() {
    if (this.isEdit) this.detectionForm.enable();
    else this.detectionForm.disable();
  }
}
