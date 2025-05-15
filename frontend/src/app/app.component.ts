import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './auth/shared/helpers/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'DevPulse';
  constructor(private themeService: ThemeService) { }

  ngOnInit() {
    this.themeService.initTheme();
  }

}
