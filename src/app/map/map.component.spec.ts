import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeafletComponent } from './map.component';

describe('MapComponent', () => {
  let component: LeafletComponent;
  let fixture: ComponentFixture<LeafletComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeafletComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LeafletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
