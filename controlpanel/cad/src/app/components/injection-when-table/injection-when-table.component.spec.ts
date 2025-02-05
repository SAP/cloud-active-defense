import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InjectionWhenTableComponent } from './injection-when-table.component';

describe('InjectionWhenTableComponent', () => {
  let component: InjectionWhenTableComponent;
  let fixture: ComponentFixture<InjectionWhenTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InjectionWhenTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InjectionWhenTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
