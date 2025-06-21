import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Task {
  id?: string;
  title: string;
  description: string;
  scheduled_date?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  created_at?: string;
  modified_at?: string;
  user?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private baseUrl = 'http://localhost:8000/tasks/';

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {}

  private getHttpOptions(): { headers: HttpHeaders } {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('auth_token') || '';
    }
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      })
    };
  }

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.baseUrl, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  createTask(task: Task): Observable<Task> {
    return this.http.post<Task>(this.baseUrl, task, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}${id}/`, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  updateTask(id: string, task: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}${id}/`, task, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`, this.getHttpOptions()).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }
}