import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-source-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './source-select.component.html',
  styleUrls: ['./source-select.component.scss']
})
export class SourceSelectComponent {
  @ViewChild('sourceSelect') sourceSelect!: ElementRef<HTMLSelectElement>;
  @ViewChild('sourceContainer', { static: true }) scrollableContainer?: ElementRef<HTMLDivElement>;
  sourceItems: string[] = ['session', 'userAgent', 'ip'];
  @Input() selectedSource: string[] = [];
  @Output() selectedSourceChange = new EventEmitter<string[]>();
  
  updateSelectedItems(event: Event) {
    const selectedIndex = Number((event.target as HTMLSelectElement).value);
    (event.target as HTMLSelectElement).value = '';
    if (this.selectedSource.includes(this.sourceItems[selectedIndex])) return;
    this.selectedSource.push(this.sourceItems[selectedIndex]);
    this.selectedSourceChange.emit(this.selectedSource);

  }
  deleteSourceItem(index: number) {
    this.selectedSource.splice(index, 1);
    this.selectedSourceChange.emit(this.selectedSource);
  }
  
  onScroll(event: WheelEvent): void {
    event.preventDefault();
    this.scrollableContainer!.nativeElement.scrollLeft += event.deltaY;
  }

  ngAfterViewInit() {
    //Prevent default value in select
    this.sourceSelect.nativeElement.selectedIndex = -1;
  }
}