import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appOnlyNumbers]',
  standalone: true
})
export class OnlyNumbersDirective {

  constructor(private el: ElementRef, private control: NgControl) {}

  @HostListener('input', ['$event']) onInputChange(event: KeyboardEvent) {
    const input = this.el.nativeElement;
    const initialValue = input.value;
    input.value = initialValue.replace(/[^0-9]*/g, '');
    
    const valueToSet = input.value === '' ? undefined : input.value;
    this.control.control?.setValue(valueToSet, { emitEvent: false });

    if (initialValue !== input.value) {
      event.stopPropagation();
    }
  }

}
