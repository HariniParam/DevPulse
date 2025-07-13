import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ResumeAnalysisService } from '../../services/resume-analysis.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// Interface for internal use - flexible to handle API response variations
interface AnalysisProgress {
  overallScore: number;
  analyses: { name: string; score: number; displayName: string }[];
  summary: string;
  recommendations: string;
  metadata: any;
}

@Component({
  selector: 'app-resume',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './resume.component.html',
  styleUrl: './resume.component.scss'
})
export class ResumeComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedPDF?: File;
  pdfURL?: SafeResourceUrl;

  analysisProgress: AnalysisProgress = {
    overallScore: 0,
    analyses: [],
    summary: '',
    recommendations: '',
    metadata: null
  };

  constructor(
    private sanitizer: DomSanitizer,
    private resumeService: ResumeAnalysisService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const navState = history.state;
    if (navState && navState.resumeAnalysis) {
      const data = navState.resumeAnalysis;

      const subscoreEntries: { name: string; score: number; displayName: string }[] =
        data.subscores
          ? Object.entries(data.subscores).map(([key, score]) => ({
            name: key,
            score: score as number,
            displayName: this.formatDisplayName(key)
          }))
          : [];

      this.analysisProgress = {
        overallScore: data.overall_score || 0,
        analyses: subscoreEntries,
        summary: data.summary || '',
        recommendations: data.recommendations || '',
        metadata: data || null
      };

      if (data.pdf_base64 && data.pdf_content_type) {
        const byteCharacters = atob(data.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.pdf_content_type });

        this.selectedPDF = new File([blob], data.filename || 'resume.pdf', { type: blob.type });
        const blobURL = URL.createObjectURL(blob);
        this.pdfURL = this.sanitizer.bypassSecurityTrustResourceUrl(blobURL + '#toolbar=0&navpanes=0&scrollbar=0');
      }

      else if (data.file_download_url) {
        fetch(data.file_download_url)
          .then(response => {
            if (!response.ok) throw new Error("Failed to download resume file.");
            return response.blob();
          })
          .then(blob => {
            this.selectedPDF = new File([blob], data.filename || 'resume.pdf', { type: blob.type });
            const blobURL = URL.createObjectURL(blob);
            this.pdfURL = this.sanitizer.bypassSecurityTrustResourceUrl(blobURL + '#toolbar=0&navpanes=0&scrollbar=0');
          })
          .catch(err => {
            console.error("Error fetching resume file:", err);
          });
      }
    }
  }

  onPanelClick(): void {
    this.fileInput.nativeElement.click();
  }

  clearPDF() {
    this.selectedPDF = undefined;
    this.pdfURL = undefined;
    this.analysisProgress = {
      overallScore: 0,
      analyses: [],
      summary: '',
      recommendations: '',
      metadata: null
    };
  }

  // Helper function to convert snake_case to display names
  private formatDisplayName(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  analyzeResume() {
    if (!this.selectedPDF) {
      alert("No file selected");
      return;
    }

    const user = this.authService.user;
    if (!user) {
      alert("User not logged in");
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedPDF);
    formData.append('user_id', user._id);

    this.resumeService.analyzeResume(formData).subscribe({
      next: (res: any) => {
        console.log('Analysis result:', res);

        // Handle subscores safely
        let subscoreEntries: { name: string; score: number; displayName: string }[] = [];
        if (res.subscores) {
          subscoreEntries = Object.entries(res.subscores).map(([key, score]) => ({
            name: key,
            score: score as number,
            displayName: this.formatDisplayName(key)
          }));
        }

        this.analysisProgress = {
          overallScore: res.overall_score || 0,
          analyses: subscoreEntries,
          summary: res.summary || '',
          recommendations: res.recommendations || '',
          metadata: res.metadata || null
        };
      },
      error: (err: any) => {
        console.error('Resume analysis failed:', err);
        alert('Failed to analyze resume. Please try again.');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (file.type === 'application/pdf') {
        this.selectedPDF = file;
        this.pdfURL = this.sanitizer.bypassSecurityTrustResourceUrl(
          URL.createObjectURL(file) + '#toolbar=0&navpanes=0&scrollbar=0'
        );
      } else {
        alert('Please upload a valid PDF file.');
      }
    }
  }
}