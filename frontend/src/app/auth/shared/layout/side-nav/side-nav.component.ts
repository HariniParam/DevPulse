import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PopupComponent } from "../../../../shared/popup/popup.component";
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../../../services/auth.service';
import { NewsService } from '../../../../services/news.service';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterModule, PopupComponent,CommonModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent {
  constructor(private router: Router, private authService: AuthService, private newsService: NewsService) { }
  
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';
  showPopup: boolean = false;
  user: User | null = null;
  previewUrl: string | null = null;

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (this.user && this.user.profilepic) {
        this.previewUrl = `http://localhost:8000/media/${this.user.profilepic}?t=${Date.now()}`;
      } else {
        this.previewUrl = 'assets/images/profile.png';
      }
    });
  }

  logout() {
    this.showAlert('Logout successful', 'success');
    setTimeout(() => {
      this.authService.logout(); // clear user, localStorage, etc.
      this.router.navigate(['/signin']);
    }, 1500);
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
