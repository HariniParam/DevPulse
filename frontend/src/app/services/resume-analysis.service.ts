import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ResumeAnalysisResponse {
  overall_score: number;
  subscore: { [key: string]: number };
  summary: string;
}

export interface ResumeAnalysis {
  _id: string;
  filename: string;
  text_length: number;
  overall_score: number;
  subscores: { [key: string]: number };
  recommendations: string;
  processing_time: number;
  timestamp: number;
}


@Injectable({ providedIn: 'root' })
export class ResumeAnalysisService {
  constructor(private http: HttpClient) { }

  analyzeResume(formData: FormData) {
    return this.http.post<ResumeAnalysisResponse>('http://localhost:8000/resume/analyse/', formData);
  }

  getLatestResumeAnalysis(userId: string): Observable<ResumeAnalysis> {
    return this.http.get<ResumeAnalysis>(`http://localhost:8000/resume/latest?user_id=${userId}`);
}

  
}
