import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TooltipComponent } from '../../../components/tooltip/tooltip.component';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AsType, AtMethodType, Decoy, isAsType, isAtMethodType, isRequestType, isVerbType, RequestType, VerbType, WhenType } from '../../../models/decoy';
import { FormWhen, InjectionWhenTableComponent } from "../../../components/injection-when-table/injection-when-table.component";
import { DecoyService } from '../../../services/decoy.service';
import { CustomValidators } from '../../../validators/customValidators';
import { ToastrService } from 'ngx-toastr';
import { ValidateDecoyFormDeactivate } from '../../../guards/deactivate/validate-decoy-form.guard';
import { Observable } from 'rxjs';


@Component({
  selector: 'app-injection',
  standalone: true,
  imports: [
    FormsModule, 
    CommonModule, 
    TooltipComponent, 
    ReactiveFormsModule, 
    RouterOutlet, 
    InjectionWhenTableComponent, 
    RouterLink
  ],
  templateUrl: './injection.component.html',
  styleUrl: './injection.component.scss'
})
export class InjectionComponent implements OnInit, ValidateDecoyFormDeactivate {
  injectionForm: FormGroup
  whenArray: FormWhen[] = [];
  decoy: Decoy = {decoy:{}};

  isUpdating = false;
  skip = false;
  displayStringInput = false;
  isWhenArrayValid = false;
  whenArrayTouched = false;
  keyRegexActive = false;
  valueRegexActive = false;

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
    this.injectionForm = new FormGroup({
      injectionPath: new FormControl('', [Validators.required, CustomValidators.isValidURL]),
      request: new FormControl('inRequest', [Validators.required]),
      verb: new FormControl(''),
      as: new FormControl('header', [Validators.required]),
      key: new FormControl(''),
      separator: new FormControl(''),
      value: new FormControl(''),
      string: new FormControl(''),
      atMethod: new FormControl(''),
      atProperty: new FormControl(''),
    }, { validators: [CustomValidators.requireStringOrKey(), CustomValidators.expectValueWithKey(), CustomValidators.atValidProperty()]})
  }
  validateDecoyForm(nextRoute: string): Observable<boolean> | Promise<boolean> | boolean {
    if (nextRoute.includes('detection') || nextRoute.includes('alert-action') || nextRoute.includes('review')) {
      if (nextRoute.includes('alert-action') && !this.decoy.detect) {
        this.toastr.warning("Cannot go to alert/action page, detect is not set yet", 'Not allowed');
        return false;
      } 
      if (this.skip) return true;
      this.injectionForm.markAllAsTouched();
  
      this.isWhenArrayValid = CustomValidators.isValidWhenTrueFalse(this.whenArray);
      if (this.injectionForm.invalid || !this.isWhenArrayValid) {
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
        if (!this.decoy.inject) this.decoy.inject = { store: { as: 'header' } };
        this.fillForm(data);
        this.isUpdating = false;
      }
    })

    this.injectionForm.get('injectionPath')?.valueChanges.subscribe(newInjectionPath => {
      this.onInjectionPathChange(newInjectionPath);
    })
    this.injectionForm.get('request')?.valueChanges.subscribe(newRequest => {
      this.onRequestChange(newRequest);
    })
    this.injectionForm.get('verb')?.valueChanges.subscribe(newVerb => {
      this.onVerbChange(newVerb);
    })
    this.injectionForm.get('as')?.valueChanges.subscribe(newAs => {
      this.onAsChange(newAs);
    })
    this.injectionForm.get('key')?.valueChanges.subscribe(newKey => {
      if (this.keyRegexActive) this.decoy.decoy.dynamicKey = newKey;
      else this.decoy.decoy.key = newKey;
    })
    this.injectionForm.get('separator')?.valueChanges.subscribe(newSeparator => {
      this.decoy.decoy.separator = newSeparator;
    })
    this.injectionForm.get('value')?.valueChanges.subscribe(newValue => {
      if (this.valueRegexActive) this.decoy.decoy.dynamicValue = newValue;
      else this.decoy.decoy.value = newValue
    })
    this.injectionForm.get('string')?.valueChanges.subscribe(newString => {
      this.decoy.decoy.string = newString
    })
    this.injectionForm.get('atMethod')?.valueChanges.subscribe(newAtMethod => {
      this.onAtMethodChange(newAtMethod);
    })
    this.injectionForm.get('atProperty')?.valueChanges.subscribe(newAtProperty => {
      this.onAtPropertyChange(newAtProperty);
    })
  }
  
  //#region Getter/Setter
  get injectionPath() {
    return this.injectionForm.get('injectionPath') as FormControl;
  }
  get request(): RequestType {
    return this.injectionForm.get('request')?.value;
  }
  set atMethod(value: AtMethodType) {
    this.injectionForm.get('atMethod')?.setValue(value, { emitEvent: true });
  }
  get atProperty(): FormControl {
    return this.injectionForm.get('atProperty') as FormControl;
  }
  set atProperty(value: string) {
    this.injectionForm.get('atProperty')?.setValue(value, { emitEvent: true });
  }
  get key() {
    return this.injectionForm.get('key') as FormControl;
  }
  get value() {
    return this.injectionForm.get('value') as FormControl;
  }
  get string() {
    return this.injectionForm.get('string') as FormControl;
  }
  get as() {
    return this.injectionForm.get('as') as FormControl;
  }
  //#endregion

  onAtMethodChange(newAtMethod: AtMethodType) {
    if (!newAtMethod) {
      delete this.decoy.inject?.store.at; 
      this.atProperty = '';
      return;
    }
    if (!isAtMethodType(newAtMethod)) return;
    if (!this.decoy.inject) this.decoy.inject = { store: { as: 'header' }};
    if (!this.decoy.inject.store.at) {
      this.decoy.inject.store.at = { method: newAtMethod, property: '' };
    } else {
      this.decoy.inject.store.at.method = newAtMethod;
    }
    this.isUpdating = true;
    this.decoyService.updateDecoy(this.decoy)
    this.isUpdating = false;
  }
  onAtPropertyChange(newAtProperty: string) {
    if (!this.decoy.inject?.store.at?.method && !newAtProperty) { delete this.decoy.inject?.store.at; return; }
    if (!this.decoy.inject) this.decoy.inject = { store: { as: 'header' }};
    if (!this.decoy.inject.store.at) {
      this.decoy.inject.store.at = { method: 'character', property: newAtProperty};
      this.atMethod = 'character';
    } else {
      this.decoy.inject.store.at.property = newAtProperty;
    }
  }
  onAsChange(newAs: AsType) {
    if (!isAsType(newAs)) return;
    if (!this.decoy.inject) this.decoy.inject = { store: { as: newAs }};
    this.decoy.inject.store.as = newAs;
  }
  onRequestChange(newRequest: RequestType) {
    if (!isRequestType(newRequest)) return;
    if (!this.decoy.inject) this.decoy.inject = { store: { as: 'header' } }
    if (newRequest !== 'inRequest') delete this.decoy.inject.store['inRequest'];
    if (newRequest !== 'inResponse') delete this.decoy.inject.store['inResponse'];
    this.decoy.inject.store[newRequest] = this.injectionPath.value;
  }
  onInjectionPathChange(newInjectionPath: string) {
    if (!this.decoy.inject) this.decoy.inject = { store: { as: 'header' } }
    if (this.request !== 'inRequest') delete this.decoy.inject.store['inRequest'];
    if (this.request !== 'inResponse') delete this.decoy.inject.store['inResponse'];
    this.decoy.inject.store[this.request] = newInjectionPath;
  }
  onVerbChange(newVerb: VerbType) {
    if (!newVerb) { delete this.decoy.inject?.store.withVerb; return }
    if (!isVerbType(newVerb)) return;
    if (!this.decoy.inject) this.decoy.inject = { store: { as: 'header' } }
    this.decoy.inject.store.withVerb = newVerb;
  }
  onWhenChange(newWhen: FormWhen[]) {
    this.whenArrayTouched = true;
    if (!this.decoy.inject) this.decoy.inject = { store: { as: 'header' } }
    this.decoy.inject.store.whenTrue = newWhen.filter(when => when.type === true).map(({ type, ...rest }) => rest as WhenType);
    this.decoy.inject.store.whenFalse = newWhen.filter(when => when.type === false).map(({ type, ...rest }) => rest as WhenType);
    if (this.decoy.inject.store.whenTrue.length === 0) delete this.decoy.inject.store.whenTrue;
    if (this.decoy.inject.store.whenFalse.length === 0 ) delete this.decoy.inject.store.whenFalse;
    this.isWhenArrayValid = CustomValidators.isValidWhenTrueFalse(newWhen);
  }
  onRegexChange(inputName: string) {
    const control = this.injectionForm.get(inputName);
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
    this.injectionForm.setValue({
      injectionPath: decoyData.inject?.store.inRequest || decoyData.inject?.store.inResponse || '',
      request: decoyData.inject?.store.inResponse != undefined ? 'inResponse' : 'inRequest',
      verb: decoyData.inject?.store.withVerb || '',
      as: decoyData.inject?.store.as || 'header',
      key: decoyData.decoy.key || '',
      separator: decoyData.decoy.separator || '',
      value: decoyData.decoy.value || '',
      string: decoyData.decoy.string || '',
      atMethod: decoyData.inject?.store.at?.method || '',
      atProperty: decoyData.inject?.store.at?.property || ''
    })
    if (decoyData.inject?.store.whenFalse){
      this.whenArray = [...this.whenArray, ...decoyData.inject.store.whenFalse.map(item => ({ ...item, type: false }))];
    }
    if (decoyData.inject?.store.whenTrue){
      this.whenArray = [...this.whenArray, ...decoyData.inject.store.whenTrue.map(item => ({ ...item, type: true }))];
    }
  }

  skipInjection() {
    this.skip = true;
    delete this.decoy.inject
    this.router.navigate(['../detection'], {
      relativeTo: this.activatedRoute
    })
  }
}
