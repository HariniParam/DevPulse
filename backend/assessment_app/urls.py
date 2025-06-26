from django.urls import path
from .views import PDFQuestionUploadView, RunCodeView

urlpatterns = [
    path('upload-pdf/', PDFQuestionUploadView.as_view()),
    path("run-code/", RunCodeView.as_view(), name="run-code"),
]
