import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListDecoyComponent } from './list-decoy.component';

describe('ListDecoyComponent', () => {
  let component: ListDecoyComponent;
  let fixture: ComponentFixture<ListDecoyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListDecoyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListDecoyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
