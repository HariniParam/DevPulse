import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFormComponent } from '../shared/auth-form/auth-form.component';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { AuthService } from '../../services/auth.service'; 
import { HttpClientModule } from '@angular/common/http';


@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [AuthFormComponent, AuthLayoutComponent, HttpClientModule ],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.scss'
})
export class SigninComponent {
  signinForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.signinForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.signinForm.valid) {
      this.authService.signin(this.signinForm.value).subscribe({
        next: (res) => {
          console.log('Login success:', res);
          this.router.navigate(['/dashboard/home']);
        },
        error: (err) => {
          console.error('Login error', err);
        }
      });
    }
  }
}