import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { Observable, Subscription } from 'rxjs';


@Component({
    selector: 'app-injection',
    imports: [
        FormsModule,
        CommonModule,
        TooltipComponent,
        ReactiveFormsModule,
        InjectionWhenTableComponent,
        RouterLink
    ],
    templateUrl: './injection.component.html',
    styleUrl: './injection.component.scss'
})
export class InjectionComponent implements OnInit, ValidateDecoyFormDeactivate, OnDestroy {
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
  isEdit = true;
  private decoySubscription?: Subscription;
  private isEditSubscription?: Subscription;

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
      request: new FormControl('inResponse', [Validators.required]),
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
    if (!this.injectionForm.dirty) return true;
    return confirm("Are you sure to leave this page ? All progress will be lost");
  }
  
  ngOnInit(): void {
    this.decoySubscription = this.decoyService.decoy$.subscribe(data => {
      if (!this.isUpdating){
        this.isUpdating = true
        this.decoy = data as Decoy;
        if (!this.decoy.inject) this.decoy.inject = { store: { as: 'header' } };
        this.fillForm(this.decoy);
        this.isUpdating = false;
      }
    })
    
    this.isEditSubscription = this.decoyService.isEdit$.subscribe(data => {
      this.isEdit = data;
      this.updateIsEdit()
    });

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

  ngOnDestroy(): void {
    this.decoySubscription?.unsubscribe();
    this.isEditSubscription?.unsubscribe();
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
    this.decoy.inject.whenTrue = newWhen.filter(when => when.type === true).map(({ type, ...rest }) => rest as WhenType);
    this.decoy.inject.whenFalse = newWhen.filter(when => when.type === false).map(({ type, ...rest }) => rest as WhenType);
    if (this.decoy.inject.whenTrue.length === 0) delete this.decoy.inject.whenTrue;
    if (this.decoy.inject.whenFalse.length === 0 ) delete this.decoy.inject.whenFalse;
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
      request: decoyData.inject?.store.inResponse || decoyData.inject?.store.inRequest ? (decoyData.inject?.store.inResponse ? 'inResponse' : 'inRequest') : 'inResponse',      
      verb: decoyData.inject?.store.withVerb || '',
      as: decoyData.inject?.store.as || 'header',
      key: decoyData.decoy.key || decoyData.decoy.dynamicKey || '',
      separator: decoyData.decoy.separator || '',
      value: decoyData.decoy.value || decoyData.decoy.dynamicValue || '',
      string: decoyData.decoy.string || '',
      atMethod: decoyData.inject?.store.at?.method || '',
      atProperty: decoyData.inject?.store.at?.property || ''
    })
    if (decoyData.inject?.whenFalse){
      this.whenArray = [...this.whenArray, ...decoyData.inject.whenFalse.map(item => ({ ...item, type: false }))];
    }
    if (decoyData.inject?.whenTrue){
      this.whenArray = [...this.whenArray, ...decoyData.inject.whenTrue.map(item => ({ ...item, type: true }))];
    }
    if (decoyData.decoy.dynamicKey) this.onRegexChange('key');
    if (decoyData.decoy.dynamicValue) this.onRegexChange('value');
  }

  skipInjection() {
    this.skip = true;
    delete this.decoy.inject
    this.router.navigate(['../detection'], {
      relativeTo: this.activatedRoute
    })
  }

  updateIsEdit() {
    if (this.isEdit) this.injectionForm.enable();
    else this.injectionForm.disable();
  }
}
