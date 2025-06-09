import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent {
  constructor(private router: Router) { }
  logout() {
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');
    this.router.navigate(['/signin']);
  }
  
}
