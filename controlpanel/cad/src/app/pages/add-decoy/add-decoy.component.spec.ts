import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddDecoyComponent } from './add-decoy.component';

describe('AddDecoyComponent', () => {
  let component: AddDecoyComponent;
  let fixture: ComponentFixture<AddDecoyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDecoyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddDecoyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
