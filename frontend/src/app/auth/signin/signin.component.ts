import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFormComponent } from '../shared/auth-form/auth-form.component';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { AuthService } from '../../services/auth.service'; 
import { HttpClientModule } from '@angular/common/http';
import { PopupComponent } from "../../shared/popup/popup.component";
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [AuthFormComponent, AuthLayoutComponent, HttpClientModule, PopupComponent,CommonModule],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.scss'
})
export class SigninComponent {
  signinForm!: FormGroup;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';
  showPopup: boolean = false;

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
    if (this.signinForm.invalid) {
      this.showAlert('Please fill in all required fields correctly.', 'error');
      return;
    }

    if (this.signinForm.valid) {
      this.authService.signin(this.signinForm.value).subscribe({
        next: (res) => {
          this.showAlert('Login successful', 'success');
          setTimeout(() => {
            this.router.navigate(['/dashboard/home']);
          }, 2000);
        },
        error: (err) => {
          this.showAlert('Login failed. Please check your credentials.', 'error');
        }
      });
    }
  }


  showAlert(message: string, type: 'success' | 'error') {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;

    setTimeout(() => {
      this.showPopup = false;
    }, 2000);
  }

}