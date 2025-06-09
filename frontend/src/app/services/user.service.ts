import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User,AuthService } from './auth.service';  // adjust path accordingly
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://localhost:8000/users';

  constructor(private http: HttpClient, private authService: AuthService) { }

  updateUser(formData: FormData) {
    return this.http.post<{ user: User }>(`${this.baseUrl}/update/`, formData).pipe(
      tap(response => {
        if (response.user) {
          this.authService.setUser(response.user);
        }
      })
    );
  }

  deleteUser(userId: string) {
    return this.http.post(`${this.baseUrl}/delete_user/`, { user_id: userId });
  }

  
}
