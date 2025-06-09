from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('signin/', views.signin, name='signin'),
    path('update/', views.update_user, name='update_user'),
    path('delete_user/', views.delete_user, name='delete_user'),
]
