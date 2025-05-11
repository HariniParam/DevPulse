import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFormComponent } from '../shared/auth-form/auth-form.component';
import { AuthLayoutComponent } from '../shared/auth-layout/auth-layout.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ AuthLayoutComponent, AuthFormComponent ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  signupForm!: FormGroup;
  
  constructor( private fb: FormBuilder, private router: Router) {
    this.signupForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  onSubmit(): void {
    if (this.signupForm.valid) {
      console.log('Successfully signed up');
      this.router.navigate(['/signin']);
    }
  }
}
