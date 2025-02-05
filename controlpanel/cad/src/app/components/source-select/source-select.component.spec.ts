import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhenAlertSelectComponent } from './source-select.component';

describe('WhenAlertSelectComponent', () => {
  let component: WhenAlertSelectComponent;
  let fixture: ComponentFixture<WhenAlertSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhenAlertSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhenAlertSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
