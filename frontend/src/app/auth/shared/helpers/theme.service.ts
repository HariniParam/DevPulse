import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeKey = 'user-theme';

  constructor() {
    // Do not access localStorage here
  }

  initTheme() {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(this.themeKey);
      const theme = savedTheme === 'dark' ? 'dark' : 'light';
      this.setTheme(theme);
    }
  }

  setTheme(theme: 'light' | 'dark') {
    if (typeof window !== 'undefined') {
      document.body.classList.toggle('dark-theme', theme === 'dark');
      localStorage.setItem(this.themeKey, theme);
    }
  }

  getCurrentTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(this.themeKey) as 'light' | 'dark') || 'light';
    }
    return 'light';
  }
}
