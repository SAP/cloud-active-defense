import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { FormWhen } from "../components/injection-when-table/injection-when-table.component";
import { FormRespond } from "../components/alert-action-table/alert-action-table.component";

export class CustomValidators {
    static isValidURL(control: FormControl): ValidationErrors | null {
        const result: { invalidUrl?: boolean, invalidRegex?: boolean } = {};
        if (control.value == '') return null

        const pathPattern = /^[a-zA-Z0-9-._~:\/?#[\]@!$&'()*+,;=]+$/;
        if (!pathPattern.test(control.value)) result.invalidUrl = true

        try {
            new RegExp(control.value);
        } catch {
            result.invalidRegex = true
        }

        if (result.invalidUrl || result.invalidRegex) {
            return result
        }
        return null;
    }
    static requireStringOrKey(): ValidatorFn {
        return (formGroup: AbstractControl): ValidationErrors | null => {
            const keyControl = formGroup.get('key');
            const stringControl = formGroup.get('string');
      
            if (keyControl && stringControl && (keyControl.value || stringControl.value)) {
              return null;  // Valid
            }
      
            return { mustHaveOne: 'At least one of key or string must be provided' };  // Invalid
          };
    }
    static isValidWhenTrueFalse(whenArray: FormWhen[]): boolean {
        for (const when of whenArray) {
            if (!when.key){
                return false;
            }
        }
        return true;
    }
    static isRegexValid(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            try {
                new RegExp(control.value);
                return null
            } catch {
                return { invalidRegex: true };
            }
        }
    }
    static expectValueWithKey(): ValidatorFn {
        return (formGroup: AbstractControl): ValidationErrors | null => {
            const value = formGroup.get('value');
            const as = formGroup.get('as');
            if (as == null) {
                const inControl = formGroup.get('in');
                if ((inControl?.value == 'header' || inControl?.value == 'cookie' || inControl?.value == 'getParam' || inControl?.value == 'postParam') && (value?.value == '' || value?.value === undefined))
                    return { missingValue: true };
                return null
            } else {
                if ((as?.value == 'header' || as?.value == 'cookie') && (value?.value == '' || value?.value === undefined))
                    return { missingValue: true };
                return null
            }
        }
    }
    static atValidProperty(): ValidatorFn {
        return (formGroup: AbstractControl): ValidationErrors | null => {
            const method = formGroup.get('atMethod');
            const property = formGroup.get('atProperty');
            if (method?.value == '') return null;
            if (property?.value == '') return { propertyRequired: true };
            if (method?.value == 'character' || method?.value == 'line') {
                if (isNaN(property?.value)) return { invalidNumber: true };
            }
            else if (method?.value == 'replace' || method?.value == 'always' || method?.value == 'after' || method?.value == 'before'){
                try {
                    new RegExp(property?.value);
                    return null
                }
                catch {
                    return { invalidRegex: true };
                }
            }
            return null
        }
    }
    static isValidRespond(whenAlert: FormRespond[]) {
        for (const when of whenAlert) {
            if (when.source == '' || when.behavior == undefined) return false;
        }
        return true;
    }
}