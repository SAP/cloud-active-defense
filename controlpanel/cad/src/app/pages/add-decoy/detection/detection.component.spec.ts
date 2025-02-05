import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetectionComponent } from './detection.component';

describe('DetectionComponent', () => {
  let component: DetectionComponent;
  let fixture: ComponentFixture<DetectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
