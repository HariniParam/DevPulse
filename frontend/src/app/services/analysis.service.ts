import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TestResult {
  _id: string;
  user_id: string;
  questions: any[];
  created_at: string;
  marks: number;
  time_taken: number;
  correct_answers: number;
  bookmark: boolean;
  total_questions: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private backendUrl = 'http://localhost:8000/analysis';

  constructor(private http: HttpClient) {}

  getTestById(testId: string): Observable<TestResult> {
    return this.http.get<TestResult>(`${this.backendUrl}/${testId}/`);
  }
}
