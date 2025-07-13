import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { TaskService, Task } from '../../services/task.service';
import { AuthService, User } from '../../services/auth.service';
import { NewsService, Article } from '../../services/news.service';
import { CommonModule } from '@angular/common';
import { ResumeAnalysisService, ResumeAnalysis, ResumeAnalysisResponse } from '../../services/resume-analysis.service';
import { AssessmentService, AssessmentAttempt } from '../../services/assessment.service';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.scss'
})
export class HomepageComponent {
  @Input() progress = 75;
  user: User | null = null;
  groupedTasksArray: { date: string, tasks: Task[] }[] = [];
  articles: Article[] = [];
  isRightPanelVisible = true;
  latestResumeAnalysis: ResumeAnalysis | null = null;
  latestAssessment: AssessmentAttempt | null = null;
  
  constructor(private router: Router, 
    private taskService: TaskService, 
    private authService: AuthService, 
    private newsService: NewsService,
    private resumeService: ResumeAnalysisService,
    private assessmentService: AssessmentService) {}

  ngOnInit(): void {
    //fetching user details
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user?._id) {
        //fetching last attended assessment details
        this.assessmentService.getAssessmentHistory(user._id).subscribe({
          next: (res) => {
            this.latestAssessment = res.tests.length > 0 ? res.tests[0] : null;
          },
          error: (err) => console.error('Failed to fetch assessment history:', err),
        });
      }
    });

    //fetching upcoming scheduled task
    this.taskService.getTasks().subscribe((tasks) => {
      const upcoming = tasks.filter(task =>
        (task.status === 'TODO' || task.status === 'IN_PROGRESS') &&
        task.scheduled_date &&
        new Date(task.scheduled_date) >= new Date()
      );

      const grouped = this.groupTasksByDate(upcoming);
      this.groupedTasksArray = Object.entries(grouped).map(([date, tasks]) => ({ date, tasks }));
    });

    //fetching news details
    this.newsService.getNews().subscribe({
      next: (data) => this.articles = data,
      error: (err) => console.error('Failed to fetch news:', err)
    });

    //fetching previous resume analysis
    this.resumeService.getLatestResumeAnalysis().subscribe({
      next: (data) => {
        this.latestResumeAnalysis = data;
      },
      error: (err) => {
        console.error('Failed to fetch latest resume analysis:', err);
      },
    });
  }

  toggleRightPanel() {
    this.isRightPanelVisible = !this.isRightPanelVisible;
  }


  private groupTasksByDate(tasks: Task[]): { [date: string]: Task[] } {
    return tasks.reduce((acc, task) => {
      const dateStr = new Date(task.scheduled_date!).toDateString();
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(task);
      return acc;
    }, {} as { [date: string]: Task[] });
  }

  //Add task popup
  navigateToTaskPageWithPopup(): void {
    this.router.navigate(['/dashboard/tasklist'], { state: { openPopup: true } });
  }

  //View task popup
  navigateToTaskDetail(taskId: string | undefined): void {
    if (!taskId) return;
    this.router.navigate(['/dashboard/tasklist'], {state: { openTaskDetail: true, taskId: taskId } });
  }

  //navigate to last attended test analysis
  viewAnalysis(test: { id: string }): void {
    this.router.navigate([`/dashboard/assesment/${test.id}/analysis`], {
      state: {
        analysisTestId: test.id
      }
    });
  }

  //navigate to last resume analysis
  navigateToResumeAnalysis(): void {
    if (this.latestResumeAnalysis) {
      this.router.navigate(['/dashboard/resume'], {
        state: {
          resumeAnalysis: this.latestResumeAnalysis
        }
      });
    }
  }

}
