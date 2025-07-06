import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { NewsService } from './news.service';

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface SigninData {
  email: string;
  password: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  profilepic: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = 'http://localhost:8000/users';
  private _user: User | null = null;
  private _userSubject = new BehaviorSubject<User | null>(null);
  user$ = this._userSubject.asObservable();

  constructor(private http: HttpClient, private newsService: NewsService) {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          const user: User = JSON.parse(storedUser);
          this._user = user;
          this._userSubject.next(user);
        } catch (e) {
          console.error('Invalid user data in localStorage');
        }
      }
    }
  }

  signup(data: SignupData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/signup/`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  signin(data: SigninData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/signin/`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    }).pipe(
      tap((response: AuthResponse) => {
        this._user = response.user;
        this._userSubject.next(response.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('auth_user', JSON.stringify(response.user));
        }
      })
    );
  }

  setUser(user: User): void {
    this._user = user;
    this._userSubject.next(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
  }

  get user(): User | null {
    return this._user;
  }

  get userId(): string | null {
    return this._user?._id || null;
  }

  logout(): void {
    this._user = null;
    this._userSubject.next(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    this.newsService.clearCache();
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (e) {
      return true;
    }
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;

    const token = localStorage.getItem('auth_token');
    return !!token && !this.isTokenExpired(token);
  }
}
