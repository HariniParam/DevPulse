from django.urls import path
from .views import ContestListView

urlpatterns = [
    path('', ContestListView.as_view(), name='contests'),
]
