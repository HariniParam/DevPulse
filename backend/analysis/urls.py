from django.urls import path
from .views import get_test_analysis

urlpatterns = [
    path('<str:test_id>/', get_test_analysis, name='get_test_analysis'),
]
