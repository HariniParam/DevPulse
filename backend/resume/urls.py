from django.urls import path
from . import views

app_name = 'resume_analyzer'

urlpatterns = [
    path('analyse/', views.ResumeAnalyseAPIView.as_view(), name='analyze_resume'),
]