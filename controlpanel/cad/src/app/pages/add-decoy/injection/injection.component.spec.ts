import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InjectionComponent } from './injection.component';

describe('InjectionComponent', () => {
  let component: InjectionComponent;
  let fixture: ComponentFixture<InjectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InjectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InjectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
