import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertActionComponent } from './alert-action.component';

describe('AlertActionComponent', () => {
  let component: AlertActionComponent;
  let fixture: ComponentFixture<AlertActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertActionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
