import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertActionTableComponent } from './alert-action-table.component';

describe('AlertActionTableComponent', () => {
  let component: AlertActionTableComponent;
  let fixture: ComponentFixture<AlertActionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertActionTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertActionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
