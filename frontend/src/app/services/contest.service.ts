import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Contest {
  site: string;
  title: string;
  startTime: number;
  endTime: number;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContestService {
  private apiUrl = 'http://localhost:8000/contests/';

  constructor(private http: HttpClient) { }

  getContests(): Observable<Contest[]> {
    return this.http.get<Contest[]>(this.apiUrl);
  }
}
