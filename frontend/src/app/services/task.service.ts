import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

  constructor(private http: HttpClient) { }

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.baseUrl).pipe(
      catchError(this.handleError)
    );
  }

  createTask(task: Task): Observable<Task> {
    return this.http.post<Task>(this.baseUrl, task).pipe(
      catchError(this.handleError)
    );
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}${id}/`).pipe(
      catchError(this.handleError)
    );
  }

  updateTask(id: string, task: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}${id}/`, task).pipe(
      catchError(this.handleError)
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }
}
