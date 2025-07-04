from django.urls import path
from .views import AssessmentHistoryView, BookmarkedTestsView, PDFQuestionUploadView, RetakeTestView, SubmitAssessmentView

urlpatterns = [
    path('upload-pdf/', PDFQuestionUploadView.as_view()),
    path('submit/', SubmitAssessmentView.as_view()),
    path('history/', AssessmentHistoryView.as_view(), name='assessment-history'),
    path('test/<str:test_id>/', RetakeTestView.as_view()),
    path('bookmark/<str:test_id>/', BookmarkedTestsView.as_view()),
    path('bookmark/', BookmarkedTestsView.as_view()), 
]
