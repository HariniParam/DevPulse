import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { User,AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ThemeService } from '../../auth/shared/helpers/theme.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PopupComponent } from "../../shared/popup/popup.component";

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PopupComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  form!: FormGroup;
  showOldPassword = false;
  showNewPassword = false;
  defaultImage = 'assets/images/default-profile.png';
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';
  showPopup: boolean = false;

  constructor(
    private fb: FormBuilder,
    private themeService: ThemeService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.authService.user?.name || '', Validators.required],
      email: [this.authService.user?.email || '', [Validators.required, Validators.email]],
      oldPassword: [''],
      newPassword: ['']
    });

    const user = this.authService.user;
    if (user && user.profilepic) {
      this.previewUrl = `http://localhost:8000/media/${user.profilepic}`;
    }
  }


  showAlert(message: string, type: 'success' | 'error') {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;

    setTimeout(() => {
      this.showPopup = false;
    }, 1500);
  }

  toggleOldPasswordVisibility() {
    this.showOldPassword = !this.showOldPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const userId = this.authService.user?._id;
    if (!userId) {
      this.showAlert('User not logged in', 'error');
      return;
    }    

    const formData = new FormData();
    formData.append('user_id', userId);

    const { name, email, oldPassword, newPassword } = this.form.value;

    if (name && name !== this.authService.user?.name) {
      formData.append('name', name);
    }
    if (email && email !== this.authService.user?.email) {
      formData.append('email', email);
    }

    if (oldPassword && newPassword) {
      formData.append('oldPassword', oldPassword);
      formData.append('newPassword', newPassword);
    }

    if (this.selectedFile) {
      formData.append('profilepic', this.selectedFile);
    }

    this.userService.updateUser(formData).subscribe({
      next: (response: any) => {
        const updatedUser: User = response.user;
        if (!updatedUser) {
          this.showAlert('No user data returned', 'error');
          return;
        }
        this.authService.setUser(updatedUser);
        this.updateFormWithUser(updatedUser);
        this.showAlert('Profile updated successfully!', 'success');
        setTimeout(() => {
          this.router.navigate(['/dashboard/home']);
        }, 1500);
      },
      error: (err) => {
        this.showAlert('Update failed. Please try again.', 'error');
      }
    });    
  }

  onDeleteAccount(): void {

    const userId = this.authService.user?._id;
    if (!userId) {
      this.showAlert('User not logged in', 'error');
      return;
    }    

    this.userService.deleteUser().subscribe({
      next: (res: any) => {
        this.showAlert('Account deleted successfully', 'success');
        setTimeout(() => {
          this.authService.logout();
          this.router.navigate(['/signin']);
        }, 1500);

      },
      error: (err) => {
        this.showAlert('Error deleting account', 'error');
      }
    });
  }
  
  

  updateFormWithUser(user: User) {
    this.form.patchValue({
      name: user.name,
      email: user.email,
    });
    this.previewUrl = `http://localhost:8000/media/${user.profilepic}`;
  }

  toggleTheme(theme: 'light' | 'dark') {
    this.themeService.setTheme(theme);
  }
}
