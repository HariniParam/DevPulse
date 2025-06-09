import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthFormComponent } from "../../auth/shared/auth-form/auth-form.component";
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../auth/shared/helpers/theme.service';


@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  form!: FormGroup;
  showPassword = false;

  constructor(private fb: FormBuilder, private router: Router, private themeService: ThemeService) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log('Updated details successfully');
      this.router.navigate(['/dashboard/home']);
    }
  }

  toggleTheme(theme: 'light' | 'dark') {
    this.themeService.setTheme(theme);
  }

}
