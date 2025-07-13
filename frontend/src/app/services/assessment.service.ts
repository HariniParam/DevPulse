import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AssessmentAttempt {
  id: string;
  title: string;
  date: string;
  numQuestions: number;
  duration: number;
  score: number;
  bookmarked: boolean;
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  constructor(private http: HttpClient) {}

  getAssessmentHistory(userId: string): Observable<{ tests: AssessmentAttempt[] }> {
    return this.http.get<{ tests: AssessmentAttempt[] }>(`http://localhost:8000/assessment/history/?user_id=${userId}`);
  }
}
