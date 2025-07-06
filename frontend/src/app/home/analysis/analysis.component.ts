import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { AnalysisService, TestResult } from '../../services/analysis.service';

interface Question {
  id: number;
  type: string;
  text: string;
  timeSpentSeconds: number;
  options?: string[];
  correctAnswer?: number;
  userAnswer?: number;
  evaluation?: { score: number; remarks: string; suggestedCode: { [lang: string]: string } };
}

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.scss'],
})
export class AnalysisComponent implements OnInit {
  testId!: string;
  testData!: TestResult;
  String = String;
  activeTab: 'analysis' | 'answers' = 'analysis';
  filterType: 'all' | 'correct' | 'incorrect' | 'coding' = 'all';
  filteredQuestions: Question[] = [];
  selectedLang: { [questionId: number]: string } = {};
  toggleVisibility: { [questionId: number]: boolean } = {};
  totalMarks = 0;

  // Analysis Data
  performanceMetrics: {
    accuracy: number;
    averageTimePerQuestion: number;
    efficiency: number;
    completion: number;
    score: number;
    maxScore: number;
  } = { accuracy: 0, averageTimePerQuestion: 0, efficiency: 0, completion: 100, score: 0, maxScore: 0 };

  timeAnalysis: {
    fastest: number;
    slowest: number;
    median: number;
    timeDistribution: { fast: number; average: number; slow: number };
  } = { fastest: 0, slowest: 0, median: 0, timeDistribution: { fast: 0, average: 0, slow: 0 } };

  strengthsWeaknesses: {
    mcqAccuracy: number;
    codingAccuracy: number;
    fastestCategory: string;
    slowestCategory: string;
  } = { mcqAccuracy: 0, codingAccuracy: 0, fastestCategory: '', slowestCategory: '' };

  // Chart Data
  scoreBarData!: ChartData<'bar'>;
  timeLineData!: ChartData<'line'>;
  accuracyPieData!: ChartData<'pie'>;
  difficultyBarData!: ChartData<'bar'>;
  performanceRadarData!: ChartData<'radar'>;
  progressLineData!: ChartData<'line'>;

  // Chart Options
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' }, title: { display: true, text: 'Section-wise Score Analysis' } },
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Score' } } },
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' }, title: { display: true, text: 'Time Spent per Question' } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Time (seconds)' } },
      x: { title: { display: true, text: 'Questions' } },
    },
  };

  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom' }, title: { display: true, text: 'Answer Distribution' } },
  };

  radarChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' }, title: { display: true, text: 'Performance Radar' } },
    scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } },
  };

  constructor(private route: ActivatedRoute, private analysisService: AnalysisService, private router: Router) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.testId = id;
        this.fetchTestData();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/assesment']);
  }

  fetchTestData(): void {
    this.analysisService.getTestById(this.testId).subscribe({
      next: (data) => {
        this.testData = data;
        this.totalMarks = this.calculateTotalMarks(this.testData.questions);
        this.initializeDefaultLanguages();
        this.calculateAnalytics();
        this.initializeVisualizations();
        this.filterQuestions();
      },
      error: (err) => console.error('Failed to fetch test data:', err),
    });
  }

  calculateTotalMarks(questions: Question[]): number {
    return questions.reduce((total, q) => {
      if (q.type === 'mcq') {
        return total + 1;
      } else if (q.type === 'coding') {
        return total + 20;
      }
      return total;
    }, 0);
  }

  filterQuestions(type: 'all' | 'correct' | 'incorrect' | 'coding' = this.filterType): void {
    this.filterType = type;
    if (!this.testData?.questions) {
      this.filteredQuestions = [];
      return;
    }

    switch (type) {
      case 'all':
        this.filteredQuestions = this.testData.questions;
        break;
      case 'correct':
        this.filteredQuestions = this.testData.questions.filter(
          q => q.userAnswer === q.correctAnswer || (q.evaluation?.score || 0) > 70
        );
        break;
      case 'incorrect':
        this.filteredQuestions = this.testData.questions.filter(
          q => q.userAnswer !== q.correctAnswer && (q.evaluation?.score || 0) <= 70
        );
        break;
      case 'coding':
        this.filteredQuestions = this.testData.questions.filter(q => q.type === 'coding');
        break;
    }
  }

  getLanguages(q: Question): string[] {
    return q?.evaluation?.suggestedCode ? Object.keys(q.evaluation.suggestedCode) : [];
  }

  initializeDefaultLanguages(): void {
    if (this.testData?.questions) {
      for (const q of this.testData.questions) {
        if (q.type === 'coding' && q.evaluation?.suggestedCode) {
          const langs = Object.keys(q.evaluation.suggestedCode);
          this.selectedLang[q.id] = langs.includes('python') ? 'python' : langs[0];
          this.toggleVisibility[q.id] = false;
        }
      }
    }
  }

  calculateAnalytics(): void {
    const questions = this.testData.questions;
    const totalQuestions = questions.length;
    const correctAnswers = this.testData.correct_answers;
    const totalTime = this.testData.time_taken;

    // Performance Metrics
    this.performanceMetrics = {
      accuracy: Math.round((correctAnswers / totalQuestions) * 100),
      averageTimePerQuestion: Math.round(totalTime / totalQuestions),
      efficiency: Math.round((correctAnswers / totalTime) * 100),
      completion: 100,
      score: this.testData.marks,
      maxScore: totalQuestions * 5,
    };

    // Time Analysis
    const timeSpent = questions.map(q => q.timeSpentSeconds);
    this.timeAnalysis = {
      fastest: Math.min(...timeSpent) || 0,
      slowest: Math.max(...timeSpent) || 0,
      median: this.calculateMedian(timeSpent),
      timeDistribution: this.categorizeTimeSpent(timeSpent),
    };

    // Strengths and Weaknesses
    const mcqQuestions = questions.filter(q => q.type === 'mcq');
    const codingQuestions = questions.filter(q => q.type === 'coding');
    this.strengthsWeaknesses = {
      mcqAccuracy: mcqQuestions.length > 0
        ? Math.round((mcqQuestions.filter(q => q.userAnswer === q.correctAnswer).length / mcqQuestions.length) * 100)
        : 0,
      codingAccuracy: codingQuestions.length > 0
        ? Math.round(codingQuestions.reduce((acc, q) => acc + (q.evaluation?.score || 0), 0) / (codingQuestions.length * 100) * 100)
        : 0,
      fastestCategory: this.getFastestCategory(questions),
      slowestCategory: this.getSlowestCategory(questions),
    };
  }

  initializeVisualizations(): void {
    this.createSectionScoreChart();
    this.createTimeLineChart();
    this.createAccuracyPieChart();
    this.createDifficultyBarChart();
    this.createPerformanceRadarChart();
    this.createProgressLineChart();
  }

  createSectionScoreChart(): void {
    const sectionScores = this.testData.questions.reduce((acc, q) => {
      const type = q.type;
      const marks = q.evaluation?.score ? (q.evaluation.score / 100) * 5 : (q.userAnswer === q.correctAnswer ? 5 : 0);
      acc[type] = (acc[type] || 0) + marks;
      return acc;
    }, {} as { [type: string]: number });

    this.scoreBarData = {
      labels: Object.keys(sectionScores).map(key => key.toUpperCase()),
      datasets: [{
        data: Object.values(sectionScores),
        label: 'Score by Type',
        backgroundColor: ['#6C4A3F', '#E2DAD6'],
        borderColor: ['#4A332D', '#4A332D'],
        borderWidth: 2,
      }],
    };
  }

  createTimeLineChart(): void {
    const timeSpent = this.testData.questions.map(q => q.timeSpentSeconds);
    const questionLabels = this.testData.questions.map((q, i) => `Q${i + 1}`);

    this.timeLineData = {
      labels: questionLabels,
      datasets: [{
        data: timeSpent,
        label: 'Time Spent (seconds)',
        borderColor: '#4A332D',
        backgroundColor: '#E2DAD6',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4A332D',
        pointBorderColor: '#E2DAD6',
        pointRadius: 5,
      }],
    };
  }

  createAccuracyPieChart(): void {
    const correctAnswers = this.testData.correct_answers;
    const totalQuestions = this.testData.total_questions;
    const incorrectAnswers = totalQuestions - correctAnswers;

    this.accuracyPieData = {
      labels: ['Correct', 'Incorrect'],
      datasets: [{
        data: [correctAnswers, incorrectAnswers],
        backgroundColor: ['#4A332D', '#E2DAD6'],
        borderColor: ['#4A332D', '#4A332D'],
        borderWidth: 2,
      }],
    };
  }

  createDifficultyBarChart(): void {
    const difficulties = this.testData.questions.map(q => {
      const timeSpent = q.timeSpentSeconds;
      const isCorrect = q.userAnswer === q.correctAnswer || (q.evaluation?.score || 0) > 70;
      if (timeSpent < 30 && isCorrect) return 'Easy';
      if (timeSpent < 60 && isCorrect) return 'Medium';
      if (timeSpent >= 60 && isCorrect) return 'Hard';
      return 'Very Hard';
    });

    const difficultyCount = difficulties.reduce((acc, diff) => {
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    this.difficultyBarData = {
      labels: Object.keys(difficultyCount),
      datasets: [{
        data: Object.values(difficultyCount),
        label: 'Questions by Difficulty',
        backgroundColor: ['#6C4A3F', '#E2DAD6', '#77625B'],
        borderColor: ['#4A332D', '#4A332D', '#4A332D'],
        borderWidth: 2,
      }],
    };
  }

  createPerformanceRadarChart(): void {
    this.performanceRadarData = {
      labels: ['Accuracy', 'Speed', 'Efficiency', 'Completion', 'Consistency'],
      datasets: [{
        label: 'Performance Metrics',
        data: [
          this.performanceMetrics.accuracy,
          Math.max(0, 100 - (this.performanceMetrics.averageTimePerQuestion / 60) * 100),
          this.performanceMetrics.efficiency,
          this.performanceMetrics.completion,
          this.calculateConsistency(),
        ],
        backgroundColor: '#E2DAD6',
        borderColor: '#4A332D',
        pointBackgroundColor: '#4A332D',
        pointBorderColor: '#E2DAD6',
        pointRadius: 5,
      }],
    };
  }

  createProgressLineChart(): void {
    const cumulativeScore = this.testData.questions.reduce((acc, q, index) => {
      const prevScore = acc[index - 1] || 0;
      const currentScore = q.evaluation?.score ? (q.evaluation.score / 100) * 5 : (q.userAnswer === q.correctAnswer ? 5 : 0);
      acc[index] = prevScore + currentScore;
      return acc;
    }, [] as number[]);

    this.progressLineData = {
      labels: this.testData.questions.map((q, i) => `Q${i + 1}`),
      datasets: [{
        data: cumulativeScore,
        label: 'Cumulative Score',
        borderColor: '#4A332D',
        backgroundColor: '#E2DAD6',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4A332D',
        pointBorderColor: '#E2DAD6',
        pointRadius: 4,
      }],
    };
  }

  calculateMedian(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  categorizeTimeSpent(timeSpent: number[]): { fast: number; average: number; slow: number } {
    const avgTime = timeSpent.reduce((a, b) => a + b, 0) / timeSpent.length;
    return {
      fast: timeSpent.filter(t => t < avgTime * 0.8).length,
      average: timeSpent.filter(t => t >= avgTime * 0.8 && t <= avgTime * 1.2).length,
      slow: timeSpent.filter(t => t > avgTime * 1.2).length,
    };
  }

  getFastestCategory(questions: Question[]): string {
    const categoryTimes = questions.reduce<{ [key: string]: number[] }>((acc, q) => {
      acc[q.type] = (acc[q.type] || []).concat(q.timeSpentSeconds);
      return acc;
    }, {});

    let fastestCategory = 'N/A';
    let fastestAvg = Infinity;

    (Object.entries(categoryTimes) as [string, number[]][]).forEach(([category, times]) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        if (avg < fastestAvg) {
          fastestAvg = avg;
          fastestCategory = category;
        }
      }
    });

    return fastestCategory;
  }

  getSlowestCategory(questions: Question[]): string {
    const categoryTimes = questions.reduce<{ [key: string]: number[] }>((acc, q) => {
      acc[q.type] = (acc[q.type] || []).concat(q.timeSpentSeconds);
      return acc;
    }, {});

    let slowestCategory = 'N/A';
    let slowestAvg = -Infinity;

    (Object.entries(categoryTimes) as [string, number[]][]).forEach(([category, times]) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        if (avg > slowestAvg) {
          slowestAvg = avg;
          slowestCategory = category;
        }
      }
    });

    return slowestCategory;
  }

  calculateConsistency(): number {
    const timeSpent = this.testData.questions.map(q => q.timeSpentSeconds);
    const mean = timeSpent.reduce((a, b) => a + b, 0) / timeSpent.length;
    const variance = timeSpent.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / timeSpent.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 100 - (stdDev / mean) * 100);
  }

  getPerformanceRating(score: number): string {
    const total = this.totalMarks;
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'average';
    return 'needs improvement';
  }
}