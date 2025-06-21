import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User,AuthService } from './auth.service';  // adjust path accordingly
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://localhost:8000/users';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('auth_token') || '';
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  updateUser(formData: FormData) {
    return this.http.post<{ user: User }>(
      `${this.baseUrl}/update/`,
      formData,
      this.getAuthHeaders()
    ).pipe(
      tap(response => {
        if (response.user) {
          this.authService.setUser(response.user);
        }
      })
    );
  }

  deleteUser() {
    // no need to pass userId; backend takes user from token
    return this.http.post(
      `${this.baseUrl}/delete_user/`,
      {}, // no body needed
      this.getAuthHeaders()
    );
  }    

  
}