import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appOnlyValidRespondProperty]',
  standalone: true
})
export class OnlyValidRespondPropertyDirective {

  constructor(private el: ElementRef, private control: NgControl) {}

  @HostListener('input', ['$event']) onInputChange(event: InputEvent) {
    const input = this.el.nativeElement;
    const initialValue = input.value;
    let value: string = initialValue.replace(/[^0-9-]/g, '');
    
    const lastChar = value.slice(-1);
    if (lastChar === '-' && value.slice(0, -1).includes('-')) value = value.slice(0, -1)

    const valueToSet = value === '' ? undefined : value;
    this.control.control?.setValue(valueToSet, { emitEvent: false });

    if (initialValue !== value) {
      event.stopPropagation();
    }
  }

}
