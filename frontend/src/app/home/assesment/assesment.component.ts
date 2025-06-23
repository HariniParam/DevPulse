import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Contest, ContestService } from '../../services/contest.service';
import { Router } from '@angular/router';

interface TestResult {
  id: number;
  title: string;
  date: string;
  numQuestions: number;
  duration: number;
  score: number;
  bookmarked: boolean;
}

@Component({
  selector: 'app-assesment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assesment.component.html',
  styleUrls: ['./assesment.component.scss']
})
export class AssesmentComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  selectedPDF?: File;
  pdfURL?: SafeResourceUrl;
  tests: TestResult[] = [
    {
      id: 1, title: 'Test-paper-01', date: '2024-05-13', numQuestions: 5, duration: 13, score: 95, bookmarked: true
    },
    {
      id: 2, title: 'Algebra Basics', date: '2024-04-18', numQuestions: 10, duration: 25, score: 78, bookmarked: false
    },
    {
      id: 3, title: 'Physics Mock-02', date: '2024-03-02', numQuestions: 8, duration: 18, score: 62, bookmarked: false
    },
    {
      id: 4, title: 'Chemistry Test', date: '2024-02-15', numQuestions: 6, duration: 20, score: 84, bookmarked: false
    },
    {
      id: 5, title: 'Logical Reasoning', date: '2024-01-20', numQuestions: 7, duration: 17, score: 88, bookmarked: true
    },
    {
      id: 6, title: 'Biology Rapid', date: '2023-12-10', numQuestions: 9, duration: 22, score: 73, bookmarked: false
    }
  ];
  contests: Contest[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private contestService: ContestService,
    private router: Router
  ) { }

  startIndex = 0;
  visibleCount = 3;

  get visibleTests(): TestResult[] {
    return this.tests.slice(this.startIndex, this.startIndex + this.visibleCount);
  }

  next(): void {
    if (this.startIndex + this.visibleCount < this.tests.length) {
      this.startIndex += 1;
    }
  }

  previous(): void {
    if (this.startIndex > 0) {
      this.startIndex -= 1;
    }
  }

  toggleBookmark(test: TestResult): void {
    test.bookmarked = !test.bookmarked;
  }

  retake(test: TestResult): void {
    console.log('Retake test', test.id);
  }

  onPanelClick(): void {
    this.fileInput.nativeElement.click();
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

  clearPDF() {
    this.selectedPDF = undefined;
    this.pdfURL = undefined;
  }

  ngOnInit(): void {
    this.contestService.getContests().subscribe({
      next: (data) => (this.contests = data),
      error: (err) => console.error(err)
    });
  }

  createAssessment(): void {
    if (!this.selectedPDF) {
      alert('Please select a PDF file before creating an assessment.');
      return;
    }
    this.router.navigate(['/dashboard/assesment/create'], {
      state: { selectedPDF: this.selectedPDF, pdfURL: this.pdfURL }
    });
  }
}