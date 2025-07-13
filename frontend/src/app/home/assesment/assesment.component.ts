import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Contest, ContestService } from '../../services/contest.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AssessmentAttempt, AssessmentService } from '../../services/assessment.service';


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
  tests: AssessmentAttempt[] = [];
  contests: Contest[] = [];
  bookmarkedTests: AssessmentAttempt[] = [];
  bookmarkSearch: string = '';
  _historySearch: string = '';
  filteredTests: AssessmentAttempt[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private contestService: ContestService,
    private router: Router,
    private http: HttpClient,
    private assessmentService: AssessmentService
  ) { }

  startIndex = 0;
  visibleCount = 3;

  get visibleTests(): AssessmentAttempt[] {
    const query = this.historySearch.toLowerCase();

    this.filteredTests = this.tests.filter(test =>
      test.title.toLowerCase().includes(query)
    );

    if (this.startIndex >= this.filteredTests.length) {
      this.startIndex = 0;
    }

    return this.filteredTests.slice(this.startIndex, this.startIndex + this.visibleCount);
  }
  

  get historySearch(): string {
    return this._historySearch;
  }
  set historySearch(value: string) {
    this._historySearch = value;
    this.startIndex = 0; 
  }
  

  next(): void {
    if (this.startIndex + this.visibleCount < this.filteredTests.length) {
      this.startIndex += 1;
    }
  }

  previous(): void {
    if (this.startIndex > 0) {
      this.startIndex -= 1;
    }
  }

  toggleBookmark(test: AssessmentAttempt): void {
    test.bookmarked = !test.bookmarked;

    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const userId = user._id;

    this.assessmentService.updateBookmark(test.id, test.bookmarked).subscribe({
      next: () => {
        console.log('Bookmark updated successfully.');
        this.fetchBookmarkedTests(userId);
      },
      error: (err) => {
        console.error('Failed to update bookmark:', err);
        alert('Failed to update bookmark in the database.');
        test.bookmarked = !test.bookmarked;
      }
    });
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

    this.assessmentService.getAssessmentHistory(userId).subscribe({
      next: (res) => this.tests = res.tests,
      error: (err) => {
        console.error('Failed to fetch tests', err);
        alert('Unable to load previous assessments.');
      }
    });

    this.fetchBookmarkedTests(userId);
    this.loadContests();
  }

  private fetchBookmarkedTests(userId: string): void {
    this.assessmentService.getBookmarkedTests(userId).subscribe({
      next: (res) => this.bookmarkedTests = res.tests,
      error: (err) => console.error('Failed to fetch bookmarks', err)
    });
  }

  private loadContests(): void {
    this.contestService.getContests().subscribe({
      next: (data) => (this.contests = data),
      error: (err) => console.error(err)
    });
  }
  
  
  retake(test: AssessmentAttempt): void {
    this.router.navigate(['/dashboard/assesment/create'], {
      state: {
        retakeFromId: test.id
      }
    });
  } 
  
  viewAnalysis(test: AssessmentAttempt): void {
    this.router.navigate([`/dashboard/assesment/${test.id}/analysis`], {
      state: {
        analysisTestId: test.id
      }
    });
  }

  filteredBookmarks(): AssessmentAttempt[] {
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

  downloadTestAsPDF(test: AssessmentAttempt): void {
    this.assessmentService.getTestQuestions(test.id)
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
  
  deleteTest(testId: string, event: Event): void {
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const userId = user._id;
    event.stopPropagation();

    if (confirm("Are you sure you want to delete this test?")) {
      this.assessmentService.deleteTest(testId).subscribe({
        next: () => {
          this.tests = this.tests.filter(t => String(t.id) !== testId);
          this.startIndex = 0;
          this.fetchBookmarkedTests(userId);
        },
        error: err => {
          console.error('Delete failed:', err);
          alert("Failed to delete the test.");
        }
      });
    }
  }
  
  
}