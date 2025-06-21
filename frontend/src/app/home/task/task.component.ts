import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../services/task.service';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent implements OnInit {
  tasks: Task[] = [];
  taskForm: FormGroup;
  showViewPopup = false;
  showAddPopup = false;
  showConfirmPopup = false;
  selectedTask: Task | null = null;
  taskToDelete: Task | null = null;
  totalTasks: number = 0;
  onProgress: number = 0;
  completed: number = 0;

  constructor(private fb: FormBuilder, private taskService: TaskService) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      scheduled_date: [''],
      status: ['TODO', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTasks();
  }

  private loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.updateTaskCounts();
      },
      error: (error) => console.error('Failed to load tasks:', error)
    });
  }

  private updateTaskCounts(): void {
    this.totalTasks = this.tasks.length;
    this.onProgress = this.tasks.filter(t => t.status === 'IN_PROGRESS').length;
    this.completed = this.tasks.filter(t => t.status === 'COMPLETED').length;
  }

  openAddTaskPopup(): void {
    this.showAddPopup = true;
    setTimeout(() => {
      const titleInput = document.querySelector('#title') as HTMLInputElement;
      if (titleInput) titleInput.focus();
    }, 0);
  }

  closeAddPopup(event?: Event): void {
    if (event && event.target !== event.currentTarget) return;
    this.showAddPopup = false;
    this.taskForm.reset({ status: 'TODO' });
  }

  saveTask(): void {
  if (this.taskForm.valid) {
    const newTask: Task = {
      title: this.taskForm.value.title,
      description: this.taskForm.value.description,
      scheduled_date: this.taskForm.value.scheduled_date || undefined,
      status: this.taskForm.value.status
    };

    this.taskService.createTask(newTask).subscribe({
      next: (task) => {
        this.tasks.unshift(task);
        this.updateTaskCounts();
        this.closeAddPopup();
        this.taskForm.reset({ status: 'TODO' });
      },
      error: (error) => {
        console.error('Failed to create task:', error);
        alert('Failed to create task. Please try again.');
      }
    });
  }
}

  openViewPopup(task: Task, event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.delete-icon')) {
      this.taskService.getTask(task.id!).subscribe({
        next: (fetchedTask) => {
          this.selectedTask = fetchedTask;
          this.showViewPopup = true;
        },
        error: (error) => console.error('Failed to fetch task:', error)
      });
    }
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
          this.updateTaskCounts();
          this.closeConfirmPopup();
        },
        error: (error) => console.error('Failed to delete task:', error)
      });
    }
  }
}