import { TestBed } from '@angular/core/testing';

import { ResumeAnalysisService } from './resume-analysis.service';

describe('ResumeAnalysisService', () => {
  let service: ResumeAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResumeAnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
