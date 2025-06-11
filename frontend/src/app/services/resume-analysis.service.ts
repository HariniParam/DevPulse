import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface ResumeAnalysisResponse {
  overall_score: number;
  subscore: { [key: string]: number };
  summary: string;
}


@Injectable({ providedIn: 'root' })
export class ResumeAnalysisService {
  constructor(private http: HttpClient) { }

  analyzeResume(formData: FormData) {
    return this.http.post<ResumeAnalysisResponse>('http://localhost:8000/resume/analyse/', formData);
  }
  
}
