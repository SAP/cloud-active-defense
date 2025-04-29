import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-when-alert-select',
    imports: [CommonModule, FormsModule],
    templateUrl: './when-alert-select.component.html',
    styleUrls: ['./when-alert-select.component.scss']
})
export class WhenAlertSelectComponent {
  @ViewChild('whenSelect') whenSelect!: ElementRef<HTMLSelectElement>;
  @ViewChild('whenContainer', { static: true }) scrollableContainer?: ElementRef<HTMLDivElement>;
  whenItems: string[] = ['whenModified', 'whenComplete', 'whenSeen', 'whenAbsent'];
  @Input() selectedWhen: string[] = [];
  @Output() selectedWhenChange = new EventEmitter<string[]>();
  touched = false;
  @Input() isEdit = true;
  
  updateSelectedItems(event: Event) {
    const selectedIndex = Number((event.target as HTMLSelectElement).value);
    (event.target as HTMLSelectElement).value = '';
    if (this.selectedWhen.includes(this.whenItems[selectedIndex])) return;
    this.selectedWhen.push(this.whenItems[selectedIndex]);
    this.selectedWhenChange.emit(this.selectedWhen);

  }
  deleteWhenItem(index: number) {
    this.selectedWhen.splice(index, 1);
    this.selectedWhenChange.emit(this.selectedWhen);
  }
  
  onScroll(event: WheelEvent): void {
    event.preventDefault();
    this.scrollableContainer!.nativeElement.scrollLeft += event.deltaY;
  }

  ngAfterViewInit() {
    //Prevent default value in select
    this.whenSelect.nativeElement.selectedIndex = -1;
  }
}