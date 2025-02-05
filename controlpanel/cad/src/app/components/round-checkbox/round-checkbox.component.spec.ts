import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoundCheckboxComponent } from './round-checkbox.component';

describe('RoundCheckboxComponent', () => {
  let component: RoundCheckboxComponent;
  let fixture: ComponentFixture<RoundCheckboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoundCheckboxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoundCheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
