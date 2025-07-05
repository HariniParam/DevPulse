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

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
    });
  }
  
  logout() {
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');
    this.newsService.clearCache();
    this.showAlert('Logout successful', 'success');
    setTimeout(() => {
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
