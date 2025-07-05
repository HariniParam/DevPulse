import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../services/task.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { PopupComponent } from '../../shared/popup/popup.component';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTooltipModule, FormsModule,  
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    PopupComponent],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit {
  tasks: Task[] = [];
  taskForm: FormGroup;
  showViewPopup = false;
  showAddPopup = false;
  showConfirmPopup = false;
  isEditMode: boolean = false;
  editTaskId: string | null = null;
  selectedTask: Task | null = null;
  taskToDelete: Task | null = null;
  totalTasks: number = 0;
  todoCount: number = 0;
  onProgress: number = 0;
  completed: number = 0;
  searchQuery: string = '';
  statusFilter: string = '';
  filteredTasks: Task[] = [];
  selectedDate: Date = new Date();
  scheduledDates: Set<string> = new Set();
  tasksLoaded: boolean = false;
  dateClass!: (date: Date) => string;
  tasksForSelectedDate: Task[] = [];
  popupVisible: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';

  private createDateClassFn() {
    return (date: Date): string => {
      const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateStr = normalized.toDateString();
      const match = this.scheduledDates.has(dateStr);
      return match ? 'marked-date' : '';
    };
  }

  constructor(private fb: FormBuilder, private taskService: TaskService, private cdr: ChangeDetectorRef, 
    private route: ActivatedRoute, private router: Router) {

    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      scheduled_date: [''],
      status: ['TODO', Validators.required]
    });
    this.dateClass = this.createDateClassFn();
  }

  ngOnInit(): void {
    this.loadTasks();
    const state = history.state; 
    if (state?.openPopup === true) {
      this.openAddTaskPopup();
      history.replaceState({}, document.title, window.location.pathname); //clearing the state to avoid reusing it
    }
    if (state?.openTaskDetail === true && state?.taskId) {
      this.openViewPopup({ id: state.taskId } as Task);
      history.replaceState({}, document.title, window.location.pathname);
    }
  }

  private loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.extractScheduledDates();
        this.dateClass = this.createDateClassFn();
        this.applyFilters();
        this.tasksLoaded = true;
        this.updateTasksForSelectedDate();
        this.refreshCalendar(); 
      },
      error: (error) => { 
        console.error('Failed to load tasks:', error);
        this.tasksLoaded = true;
      }
    });
  }

  private refreshCalendar(): void {
    this.tasksLoaded = false;
    setTimeout(() => {
      this.tasksLoaded = true; 
      this.cdr.detectChanges();
    }, 0);
  }

  private extractScheduledDates(): void {
    this.scheduledDates.clear();

    this.tasks.forEach(task => {
      if (task.scheduled_date) {
        const date = new Date(task.scheduled_date);
        const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        this.scheduledDates.add(normalized.toDateString());
      }
    });
  }

  onSelectedDateChange(date: Date | null) {
    if (date) {
      this.selectedDate = date;
      this.updateTasksForSelectedDate();
    }
  }

  private updateTasksForSelectedDate(): void {
    const selected = new Date(this.selectedDate);
    const normalizedSelected = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());

    this.tasksForSelectedDate = this.tasks.filter(task => {
      if (!task.scheduled_date) return false;
      const taskDate = new Date(task.scheduled_date);
      const normalizedTaskDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      return normalizedTaskDate.getTime() === normalizedSelected.getTime();
    });
  }

  toggleTaskStatus(task: Task): void {
    const updatedStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';

    const updatedTask: Task = {
      ...task,
      status: updatedStatus
    };

    this.taskService.updateTask(task.id!, updatedTask).subscribe({
      next: (res) => {
        task.status = res.status;
        this.applyFilters();
        this.updateTasksForSelectedDate();
      },
      error: (err) => console.error('Failed to toggle task status:', err)
    });
  }


  applyFilters(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredTasks = this.tasks.filter(task => {
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesStatus = this.statusFilter ? task.status === this.statusFilter : true;
      return matchesTitle && matchesStatus;
    });

    this.updateTaskCounts(this.filteredTasks);
  }

  private updateTaskCounts(list: Task[] = this.tasks): void {
    this.totalTasks = list.length;
    this.todoCount = list.filter(t => t.status === 'TODO').length;
    this.onProgress = list.filter(t => t.status === 'IN_PROGRESS').length;
    this.completed = list.filter(t => t.status === 'COMPLETED').length;
  }

  openAddTaskPopup(task?: Task): void {
    this.isEditMode = !!task;
    this.showAddPopup = true;

    if (task) {
      this.editTaskId = task.id || null;
      this.taskForm.patchValue({
        title: task.title,
        description: task.description,
        scheduled_date: task.scheduled_date,
        status: task.status
      });
    } else {
      this.taskForm.reset({ status: 'TODO' });
      this.editTaskId = null;
    }

    setTimeout(() => {
      const titleInput = document.querySelector('#title') as HTMLInputElement;
      if (titleInput) titleInput.focus();
    }, 0);
  }

  closeAddPopup(event?: Event): void {
    if (event && event.target !== event.currentTarget) return;
    this.showAddPopup = false;
    this.taskForm.reset({ status: 'TODO' });
    this.isEditMode = false;
    this.editTaskId = null;
  }

  saveTask(): void {
    if (this.taskForm.invalid) return;

    const taskPayload: Task = {
      title: this.taskForm.value.title,
      description: this.taskForm.value.description,
      scheduled_date: this.taskForm.value.scheduled_date || undefined,
      status: this.taskForm.value.status
    };

    if (this.isEditMode && this.editTaskId) {
      this.taskService.updateTask(this.editTaskId, taskPayload).subscribe({
        next: (updatedTask) => {
          const index = this.tasks.findIndex(t => t.id === this.editTaskId);
          if (index !== -1) this.tasks[index] = updatedTask;
          if (this.selectedTask?.id === this.editTaskId) {
            this.selectedTask = { ...updatedTask };
          }
          this.extractScheduledDates(); 
          this.dateClass = this.createDateClassFn();
          this.applyFilters();
          this.updateTasksForSelectedDate();
          this.refreshCalendar(); 
          this.closeAddPopup();
          this.showPopup('Task updated successfully!', 'success');
        },
        error: (err) => {
          console.error('Failed to update task:', err);
          this.showPopup('Failed to update task.', 'error');
        }
      });
    } else {
      this.taskService.createTask(taskPayload).subscribe({
        next: (task) => {
          this.tasks.unshift(task);
          this.extractScheduledDates();
          this.dateClass = this.createDateClassFn();
          this.applyFilters(); 
          this.updateTasksForSelectedDate();
          this.refreshCalendar(); 
          this.closeAddPopup();
          this.showPopup('Task created successfully!', 'success');
        },
        error: (err) => {
          console.error('Failed to create task:', err);
          this.showPopup('Task created successfully!', 'success');
        }
      });
    }
  }

  openViewPopup(task: Task, event?: Event): void {
    this.taskService.getTask(task.id!).subscribe({
      next: (fetchedTask) => {
        this.selectedTask = fetchedTask;
        this.showViewPopup = true;
      },
      error: (error) => console.error('Failed to fetch task:', error)
    });
  }

  closeViewPopup(event?: Event): void {
    if (event && event.target !== event.currentTarget) return;
    this.showViewPopup = false;
    this.selectedTask = null;
  }

  openConfirmPopup(task: Task, event: Event): void {
    event.stopPropagation();
    this.taskToDelete = task;
    this.showConfirmPopup = true;
  }

  closeConfirmPopup(event?: Event): void {
    if (event && event.target !== event.currentTarget) return;
    this.showConfirmPopup = false;
    this.taskToDelete = null;
  }

  confirmDelete(): void {
    if (this.taskToDelete && this.taskToDelete.id) {
      this.taskService.deleteTask(this.taskToDelete.id).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(t => t.id !== this.taskToDelete!.id);
          if (this.selectedTask?.id === this.taskToDelete?.id) {
            this.closeViewPopup();
          }
          this.applyFilters();
          this.closeConfirmPopup();
          this.showPopup('Task deleted successfully!', 'success');
        },
        error: (error) => {
          console.error('Failed to delete task:', error);
          this.showPopup('Failed to delete task.', 'error');
        }
      });
    }
  }

  showPopup(message: string, type: 'success' | 'error' = 'success') {
    this.popupMessage = message;
    this.popupType = type;
    this.popupVisible = true;
    setTimeout(() => this.popupVisible = false, 3000);
  }
}