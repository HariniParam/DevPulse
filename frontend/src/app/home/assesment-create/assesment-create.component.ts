  import {
    Component,
    OnInit,
    OnDestroy,
    ViewChild,
    ElementRef,
    PLATFORM_ID,
    Inject
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { HttpClient, HttpClientModule } from '@angular/common/http';
  import { Router } from '@angular/router';
  import { isPlatformBrowser } from '@angular/common';
  import { SafeResourceUrl } from '@angular/platform-browser';

declare const monaco: any;
interface Question {
  id: number;
  type: 'mcq' | 'coding';
  text: string;
  options?: string[];
  correctAnswer?: number;
  code?: string;
  language?: string;
  testCases?: { input: string; expectedOutput: string }[];
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
  showSubmitPopup: boolean = false;
  testStarted: boolean = false;
  testTimeElapsed: number = 0;
  timeSpent: { [questionId: number]: number } = {};
  questionStartTime: number = 0;


  timeLeft: string = '45:00';
  private timerInterval: any;
  private totalSeconds: number = 45 * 60;
  private tabSwitchCount: number = 0;
  private maxTabSwitches: number = 5;
  retakeTestId: string | null = null;
  private visibilityChangeHandler = this.handleVisibilityChange.bind(this);

  constructor(
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.selectedPDF = navigation.extras.state['selectedPDF'] || null;
      this.pdfURL = navigation.extras.state['pdfURL'] || null;
      this.retakeTestId = navigation.extras.state['retakeFromId'] || null;
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMonacoEditor();
      this.setupTabSwitchDetection();
    }
    if (this.retakeTestId) {
      this.loadRetakeTest(this.retakeTestId);
    } else if (this.selectedPDF) {
      this.uploadPDF();
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  loadRetakeTest(testId: string) {
    this.http.get<any>(`http://localhost:8000/assessment/test/${testId}/`).subscribe({
      next: (res) => {
        this.questions = res.questions || [];
        if (this.questions.length > 0) {
          this.selectedQuestionId = this.questions[0].id;
          this.selectedQuestion = this.questions[0];
          this.startTimer();  
          this.questionStartTime = Date.now();
        }
      },
      error: (err) => {
        console.error('Failed to load retake test:', err);
        alert('Failed to load previous test.');
      }
    });
  }

  startTimer() {
    this.testStarted = true;
    this.timerInterval = setInterval(() => {
      this.totalSeconds--;
      this.testTimeElapsed++;
      const minutes = Math.floor(this.totalSeconds / 60);
      const seconds = this.totalSeconds % 60;
      this.timeLeft = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      if (this.totalSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.showSubmitPopup = true;
      }
    }, 1000);
  }

  openSubmitPopup() {
    this.showSubmitPopup = true;
  
    // Stop timer when popup opens
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  

  confirmFinalSubmit() {
    this.submit();
  }

  get mcqCount(): number {
    return this.questions.filter(q => q.type === 'mcq' && this.answers[q.id] !== undefined).length;
  }

  get codingCount(): number {
    return this.questions.filter(q => q.type === 'coding' && this.answers[q.id] !== undefined).length;
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
      const savedCode = this.answers[this.selectedQuestion.id] as string || this.selectedQuestion.code || '';

      this.editor = monaco.editor.create(this.editorElement.nativeElement, {
        value: savedCode,
        language: this.selectedQuestion.language || this.selectedLanguage,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14
      });

      this.editor.onDidChangeModelContent(() => {
        const code = this.editor.getValue();
        this.answers[this.selectedQuestionId] = code;
      });
    }
  }

  cancelSubmitPopup() {
    this.showSubmitPopup = false;

    // Resume the timer
    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => {
        if (this.totalSeconds <= 0) {
          clearInterval(this.timerInterval);
          this.timeLeft = '00:00';
          this.submit();
          return;
        }
        this.totalSeconds--;
        const minutes = Math.floor(this.totalSeconds / 60);
        const seconds = this.totalSeconds % 60;
        this.timeLeft = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
    }
  }
  
  

  private setupTabSwitchDetection() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  private handleVisibilityChange() {
    if (isPlatformBrowser(this.platformId) && document.hidden) {
      this.tabSwitchCount++;
      if (this.tabSwitchCount > this.maxTabSwitches) {
        this.openSubmitPopup();
      } else {
        alert(`Don't change tab! Remaining: ${this.maxTabSwitches - this.tabSwitchCount + 1}`);
      }
    }
  }

  uploadPDF() {
    if (!this.selectedPDF) return;

    const formData = new FormData();
    formData.append('pdf_file', this.selectedPDF);

    this.http.post('http://localhost:8000/assessment/upload-pdf/', formData).subscribe({
      next: (response: any) => {
        this.questions = response.questions;
        if (this.questions.length > 0) {
          this.selectedQuestionId = this.questions[0].id;
          this.selectedQuestion = this.questions[0];
          this.startTimer();  
          this.questionStartTime = Date.now();
        } else {
          alert('No questions generated');
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        alert('Failed to load questions');
      }
    });
  }

  selectQuestion(id: number) {
    const now = Date.now();

    if (this.selectedQuestion) {
      const prevId = this.selectedQuestion.id;
      const timeOnPrev = (now - this.questionStartTime) / 1000;
      this.timeSpent[prevId] = (this.timeSpent[prevId] || 0) + timeOnPrev;
    }

    if (this.editor && this.selectedQuestion?.type === 'coding') {
      const prevCode = this.editor.getValue();
      this.answers[this.selectedQuestion.id] = prevCode;
    }

    this.selectedQuestionId = id;
    this.selectedQuestion = this.questions.find(q => q.id === id) || null;

    this.questionStartTime = Date.now();

    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }

    if (this.selectedQuestion?.type === 'coding') {
      this.selectedLanguage = this.selectedQuestion.language || 'javascript';
      setTimeout(() => this.initEditorIfNeeded(), 0);
    }
  }

  onLanguageChange(newLang: string) {
    this.selectedLanguage = newLang;
    if (this.editor) {
      monaco.editor.setModelLanguage(this.editor.getModel(), newLang);
    }
    if (this.selectedQuestion?.type === 'coding') {
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

  submit() {
    const now = Date.now();
    if (this.selectedQuestion) {
      const lastId = this.selectedQuestion.id;
      this.timeSpent[lastId] = (this.timeSpent[lastId] || 0) + (now - this.questionStartTime) / 1000;
    }


    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const userId = user._id;

    const answeredQuestions = this.questions.map(q => {
      const userAnswer = this.answers[q.id];
      const qTime = this.timeSpent[q.id] || 0;
      const base = {
        id: q.id,
        type: q.type,
        text: q.text,
        timeSpentSeconds: Math.round(qTime)
      };
      if (q.type === 'mcq') {
        return {
          ...base,
          options: q.options,
          correctAnswer: q.correctAnswer,
          userAnswer
        };
      } else {
        return {
          ...base,
          language: q.language || this.selectedLanguage,
          userAnswer
        };
      }
    });

    const payload = {
      user_id: userId,
      test_id: `test_${Date.now()}`,
      created_at: new Date().toISOString(),
      bookmark: false,
      total_questions: this.questions.length,
      time_taken_seconds: this.testTimeElapsed,
      questions: answeredQuestions,
      num_correct: answeredQuestions.filter(q => q.type === 'mcq' && (q as any).userAnswer === (q as any).correctAnswer).length,
      marks: 0
    };

    this.http.post('http://localhost:8000/assessment/submit/', payload).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/assesment']);
      },
      error: () => alert('Failed to submit test')
    });

    clearInterval(this.timerInterval);
  }
   
}
