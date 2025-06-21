from django.urls import path
from .views import TaskListCreateView, TaskRetrieveUpdateDeleteView

urlpatterns = [
    path('', TaskListCreateView.as_view(), name='task-list-create'),
    path('<str:task_id>/', TaskRetrieveUpdateDeleteView.as_view(), name='task-detail'),
]