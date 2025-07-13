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

export interface Question {
  id: number;
  type: 'mcq' | 'coding';
  text: string;
  options?: string[];
  correctAnswer?: number;
  code?: string;
  language?: string;
  testCases?: { input: string; expectedOutput: string }[];
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  constructor(private http: HttpClient) {}

  getAssessmentHistory(userId: string): Observable<{ tests: AssessmentAttempt[] }> {
    return this.http.get<{ tests: AssessmentAttempt[] }>(`http://localhost:8000/assessment/history/?user_id=${userId}`);
  }

  getBookmarkedTests(userId: string): Observable<{ tests: AssessmentAttempt[] }> {
    return this.http.get<{ tests: AssessmentAttempt[] }>(`http://localhost:8000/assessment/bookmark/?user_id=${userId}`);
  }

  updateBookmark(testId: string, bookmarked: boolean): Observable<any> {
    return this.http.patch(`http://localhost:8000/assessment/bookmark/${testId}/`, { bookmarked });
  }

  deleteTest(testId: string): Observable<any> {
    return this.http.delete(`http://localhost:8000/assessment/test/${testId}/`);
  }

  getTestQuestions(testId: string): Observable<{ questions: any[] }> {
    return this.http.get<{ questions: any[] }>(`http://localhost:8000/assessment/test/${testId}/`);
  }

  submitAssessment(payload: any): Observable<any> {
    return this.http.post(`http://localhost:8000/assessment/submit/`, payload);
  }

  uploadPDF(file: File): Observable<{ questions: any[] }> {
    const formData = new FormData();
    formData.append('pdf_file', file);
    return this.http.post<{ questions: any[] }>(`http://localhost:8000/assessment/upload-pdf/`, formData);
  }
}
