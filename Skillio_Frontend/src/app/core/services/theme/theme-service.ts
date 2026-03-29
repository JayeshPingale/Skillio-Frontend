import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Signal to track current theme
  private themeSignal = signal<Theme>(this.getInitialTheme());

  constructor() {
    // Effect to apply theme changes to document
    effect(() => {
      const theme = this.themeSignal();
      this.applyTheme(theme);
    });
  }
  currentTheme(): Theme {
    return this.themeSignal();
  }
  // Get initial theme from localStorage or default to 'dark'
  private getInitialTheme(): Theme {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'dark';
  }

  // Get current theme as signal (readonly)
  get theme() {
    return this.themeSignal.asReadonly();
  }

  // Toggle between light and dark
  toggleTheme(): void {
    const currentTheme = this.themeSignal();
    const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  // Set specific theme
  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
    localStorage.setItem('theme', theme);
  }

  // Apply theme to document
  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;
    
    // Remove both classes first
    htmlElement.classList.remove('light-theme', 'dark-theme');
    
    // Add the current theme class
    htmlElement.classList.add(`${theme}-theme`);
    
    // Optional: Set attribute for CSS targeting
    htmlElement.setAttribute('data-theme', theme);
    
    console.log(`Theme changed to: ${theme}`);
  }

  // Check if current theme is dark
  isDark(): boolean {
    return this.themeSignal() === 'dark';
  }

  // Check if current theme is light
  isLight(): boolean {
    return this.themeSignal() === 'light';
  }
}
