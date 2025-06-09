import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-resume',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resume.component.html',
  styleUrl: './resume.component.scss'
})
export class ResumeComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedPDF?: File;
  pdfURL?: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) { }

  analysisProgress = {
    overallScore: 63, 
    analyses: [
      { name: 'Skills Match', score: 85 },
      { name: 'Experience Match', score: 70 },
      { name: 'Education Level', score: 90 },
      { name: 'Grammar Check', score: 65 },
      { name: 'Keyword Density', score: 80 }
    ],
    summary: `This resume showcases strong educational background and decent keyword density. 
    Skills and experience can be better aligned with the job role.This resume showcases strong 
    educational background and decent keyword density. Skills and experience can be better aligned 
    with the job role.This resume showcases strong educational background and decent keyword density.
    Skills and experience can be better aligned with the job role.This resume showcases strong
    educational background and decent keyword density. Skills and experience can be better aligned with the job role.`
  };
  

  onPanelClick(): void {
    this.fileInput.nativeElement.click();
  }

  clearPDF() {
    this.selectedPDF = undefined;
    this.pdfURL = undefined;
  }

  analyzeResume() {
    // Add your resume analysis logic here
    console.log('Resume submitted for analysis:', this.selectedPDF);
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
