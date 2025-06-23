import { Component, OnInit, OnDestroy, ViewChild, ElementRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { SafeResourceUrl } from '@angular/platform-browser';

// Declare Monaco Editor global variable
declare const monaco: any;

interface Question {
  id: number;
  type: 'mcq' | 'coding';
  text: string;
  options?: string[];
  correctAnswer?: number;
  code?: string;
  language?: string;
}

@Component({
  selector: 'app-assesment-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './assesment-create.component.html',
  styleUrls: ['./assesment-create.component.scss']
})
export class AssesmentCreateComponent implements OnInit, OnDestroy {
  @ViewChild('editor', { static: false }) editorElement!: ElementRef;
  private editor: any;

  languages = ['javascript', 'python', 'c', 'cpp', 'java'];
  selectedLanguage: string = 'javascript';
  questions: Question[] = [];
  selectedQuestionId: number = 0;
  selectedQuestion: Question | null = null;
  answers: { [key: number]: number | string } = {};
  selectedPDF: File | null = null;
  pdfURL: SafeResourceUrl | null = null;

  // Timer properties
  timeLeft: string = '45:00';
  private timerInterval: any;
  private totalSeconds: number = 45 * 60;

  // Tab switch tracking
  private tabSwitchCount: number = 0;
  private maxTabSwitches: number = 5;

  constructor(
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.selectedPDF = navigation.extras.state['selectedPDF'] || null;
      this.pdfURL = navigation.extras.state['pdfURL'] || null;
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMonacoEditor();
      this.setupTabSwitchDetection();
    }
    this.startTimer();
    if (this.selectedPDF) {
      this.uploadPDF();
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  private startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.totalSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.timeLeft = '00:00';
        this.submit('Time is up!');
        return;
      }
      this.totalSeconds--;
      const minutes = Math.floor(this.totalSeconds / 60);
      const seconds = this.totalSeconds % 60;
      this.timeLeft = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  private loadMonacoEditor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const existingScript = document.getElementById('monaco-loader');
    if (existingScript) return;

    const script = document.createElement('script');
    script.id = 'monaco-loader';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs/loader.min.js';
    script.onload = () => {
      (window as any).require.config({
        paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs' }
      });
      (window as any).require(['vs/editor/editor.main'], () => {
        this.initEditorIfNeeded();
      });
    };
    document.body.appendChild(script);
  }

  private initEditorIfNeeded() {
    if (this.selectedQuestion?.type === 'coding' && this.editorElement && !this.editor) {
      this.editor = monaco.editor.create(this.editorElement.nativeElement, {
        value: this.selectedQuestion.code || '',
        language: this.selectedQuestion.language || this.selectedLanguage,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        lineNumbers: 'on'
      });

      this.editor.onDidChangeModelContent(() => {
        const code = this.editor.getValue();
        this.answers[this.selectedQuestionId] = code;
      });
    }
  }

  private setupTabSwitchDetection() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  private handleVisibilityChange() {
    if (isPlatformBrowser(this.platformId) && document.hidden) {
      this.tabSwitchCount++;
      if (this.tabSwitchCount > this.maxTabSwitches) {
        this.submit('Test ended due to excessive tab switches!');
      } else {
        alert(`Don't change tab! Tab switches remaining: ${this.maxTabSwitches - this.tabSwitchCount}`);
      }
    }
  }

  uploadPDF() {
    if (!this.selectedPDF) {
      alert('No PDF file selected');
      return;
    }

    const formData = new FormData();
    formData.append('pdf_file', this.selectedPDF);

    this.http.post('http://localhost:8000/assessment/upload-pdf/', formData).subscribe({
      next: (response: any) => {
        this.questions = response.questions;
        if (this.questions.length > 0) {
          this.selectedQuestionId = this.questions[0].id;
          this.selectedQuestion = this.questions[0];
          alert('Questions loaded successfully');
        } else {
          alert('No questions generated from the PDF');
        }
      },
      error: (error) => {
        console.error('Error uploading PDF:', error);
        alert('Failed to load questions');
      }
    });
  }

  selectQuestion(id: number) {
    this.selectedQuestionId = id;
    this.selectedQuestion = this.questions.find(q => q.id === id) || null;

    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }

    if (this.selectedQuestion?.type === 'coding') {
      this.selectedLanguage = this.selectedQuestion.language || 'javascript';
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.initEditorIfNeeded(), 0);
      }
    }
  }

  onLanguageChange(newLang: string) {
    this.selectedLanguage = newLang;
    if (this.editor) {
      monaco.editor.setModelLanguage(this.editor.getModel(), newLang);
    }
    if (this.selectedQuestion && this.selectedQuestion.type === 'coding') {
      this.selectedQuestion.language = newLang;
    }
  }

  nextQuestion() {
    const currentIndex = this.questions.findIndex(q => q.id === this.selectedQuestionId);
    if (currentIndex < this.questions.length - 1) {
      const nextId = this.questions[currentIndex + 1].id;
      this.selectQuestion(nextId);
    }
  }

  public getCode(): string {
    return this.editor ? this.editor.getValue() : '';
  }

  public setCode(code: string) {
    if (this.editor) {
      this.editor.setValue(code);
    }
  }

  submit(message: string = 'Test submitted (mock implementation).') {
    if (this.editor && this.selectedQuestion?.type === 'coding') {
      this.answers[this.selectedQuestionId] = this.editor.getValue();
    }
    console.log('Answers:', this.answers);
    alert(message);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    this.router.navigate(['/dashboard/assesment']);
  }
}