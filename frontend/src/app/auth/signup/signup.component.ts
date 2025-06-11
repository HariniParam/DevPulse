import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFormComponent } from '../shared/auth-form/auth-form.component';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';
import { AuthService } from '../../services/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { PopupComponent } from '../../shared/popup/popup.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, AuthLayoutComponent, AuthFormComponent, HttpClientModule, PopupComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  signupForm!: FormGroup;

  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';
  showPopup: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.signupForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  showAlert(message: string, type: 'success' | 'error') {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    setTimeout(() => {
      this.showPopup = false;
    }, 2000);
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.showAlert('Please fill in all required fields correctly.', 'error');
      return;
    }

    this.authService.signup(this.signupForm.value).subscribe({
      next: (res) => {
        this.showAlert('Signup successful!', 'success');
        setTimeout(() => {
          this.router.navigate(['/signin']);
        }, 1500);
      },
      error: (err) => {
        this.showAlert('Signup failed. Please try again.', 'error');
      }
    });
  }
  
}
