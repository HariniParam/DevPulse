import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ResumeAnalysisService } from '../../services/resume-analysis.service';

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
    private resumeService: ResumeAnalysisService
  ) { }

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

    const formData = new FormData();
    formData.append('file', this.selectedPDF);

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