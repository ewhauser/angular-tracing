import { async, TestBed } from '@angular/core/testing';
import { ZipkinModule } from './zipkin.module';

describe('AngularTracingModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ZipkinModule]
    }).compileComponents();
  }));

  it('should create', () => {
    expect(ZipkinModule).toBeDefined();
  });
});
