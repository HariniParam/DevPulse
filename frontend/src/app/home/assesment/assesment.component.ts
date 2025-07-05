import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Contest, ContestService } from '../../services/contest.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
  imports: [CommonModule, FormsModule],
  templateUrl: './assesment.component.html',
  styleUrls: ['./assesment.component.scss']
})
export class AssesmentComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  selectedPDF?: File;
  pdfURL?: SafeResourceUrl;
  tests: TestResult[] = [];
  contests: Contest[] = [];
  bookmarkedTests: TestResult[] = [];
  bookmarkSearch: string = '';


  constructor(
    private sanitizer: DomSanitizer,
    private contestService: ContestService,
    private router: Router,
    private http: HttpClient
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
    // Toggle locally
    test.bookmarked = !test.bookmarked;

    // Call backend to update
    this.http.patch(`http://localhost:8000/assessment/bookmark/${test.id}/`, {
      bookmarked: test.bookmarked
    }).subscribe({
      next: () => {
        console.log('Bookmark updated successfully.');
      },
      error: (err) => {
        console.error('Failed to update bookmark:', err);
        alert('Failed to update bookmark in the database.');
        // Revert on failure
        test.bookmarked = !test.bookmarked;
      }
    });
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const userId = user._id;
    this.fetchBookmarkedTests(userId);
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
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const userId = user._id;

    if (!userId) {
      alert('User not logged in');
      return;
    }

    this.fetchAssessmentHistory(userId);
    this.fetchBookmarkedTests(userId);
    this.loadContests();
  }

  private fetchAssessmentHistory(userId: string): void {
    this.http.get<{ tests: TestResult[] }>(`http://localhost:8000/assessment/history/?user_id=${userId}`)
      .subscribe({
        next: (res) => {
          this.tests = res.tests;
        },
        error: (err) => {
          console.error('Failed to fetch tests', err);
          alert('Unable to load previous assessments.');
        }
      });
  }

  private fetchBookmarkedTests(userId: string): void {
    this.http.get<{ tests: TestResult[] }>(`http://localhost:8000/assessment/bookmark/?user_id=${userId}`)
      .subscribe({
        next: (res) => {
          this.bookmarkedTests = res.tests;
        },
        error: (err) => {
          console.error('Failed to fetch bookmarks', err);
        }
      });
  }

  private loadContests(): void {
    this.contestService.getContests().subscribe({
      next: (data) => (this.contests = data),
      error: (err) => console.error(err)
    });
  }
  
  
  retake(test: TestResult): void {
    this.router.navigate(['/dashboard/assesment/create'], {
      state: {
        retakeFromId: test.id
      }
    });
  }  

  filteredBookmarks(): TestResult[] {
    const query = this.bookmarkSearch.toLowerCase();
    return this.bookmarkedTests.filter(test =>
      test.title.toLowerCase().includes(query)
    );
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

  downloadTestAsPDF(test: TestResult): void {
    this.http.get<{ questions: any[] }>(`http://localhost:8000/assessment/test/${test.id}/`)
      .subscribe({
        next: (res) => {
          const questions = res.questions || [];
          const doc = new jsPDF();
          let y = 10;
  
          doc.setFontSize(18);
          doc.text(`${test.title}`, 10, y);
          y += 10;
  
          questions.forEach((q, index) => {
            y += 10;
            doc.setFontSize(14);
            doc.text(`Q${index + 1}.`, 10, y);
  
            autoTable(doc, {
              startY: y + 2,
              margin: { left: 20 },
              body: [[q.text || '']],
              styles: { fontSize: 12, cellPadding: 2 },
              theme: 'plain'
            });
  
            y = (doc as any).lastAutoTable.finalY;
  
            if (q.type === 'mcq') {
              const options = (q.options || []).map((opt: string, i: number) => [`Option ${i + 1}`, opt]);
              autoTable(doc, {
                startY: y + 2,
                head: [['Option', 'Text']],
                body: options,
                styles: { fontSize: 11 },
                margin: { left: 20 }
              });
              y = (doc as any).lastAutoTable.finalY + 2;
  
              doc.setFontSize(12);
              doc.text(`Correct Answer: Option ${q.correctAnswer + 1}`, 20, y);
              y += 5;
            } else if (q.type === 'coding') {
              doc.setFontSize(12);
              doc.text(`Language: ${q.language || 'N/A'}`, 20, y);
              y += 5;
  
              doc.text('Initial Code:', 20, y);
              y += 2;
  
              autoTable(doc, {
                startY: y + 2,
                margin: { left: 25 },
                body: [[q.code || '']],
                styles: { fontSize: 10, cellPadding: 2 },
                theme: 'plain'
              });
              y = (doc as any).lastAutoTable.finalY + 2;
  
              if (Array.isArray(q.testCases)) {
                doc.text('Test Cases:', 20, y);
                y += 2;
  
                const testCases = q.testCases.map((tc: any, i: number) => [
                  `#${i + 1}`,
                  JSON.stringify(tc.input),
                  String(tc.expectedOutput)
                ]);
  
                autoTable(doc, {
                  startY: y + 2,
                  head: [['Test Case', 'Input', 'Expected Output']],
                  body: testCases,
                  styles: { fontSize: 10 },
                  margin: { left: 25 }
                });
                y = (doc as any).lastAutoTable.finalY + 5;
              }
            }
  
            if (y > 260) {
              doc.addPage();
              y = 10;
            }
          });
  
          doc.save(`${test.title.replace(/\s+/g, '_')}_questions.pdf`);
        },
        error: (err) => {
          console.error('Failed to download PDF:', err);
          alert('Failed to download PDF.');
        }
      });
  }
  
  
}