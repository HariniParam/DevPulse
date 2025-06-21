from django.urls import path
from .views import SignupView, SigninView, UpdateUserView, DeleteUserView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('signin/', SigninView.as_view(), name='signin'),
    path('update/', UpdateUserView.as_view(), name='update_user'),
    path('delete_user/', DeleteUserView.as_view(), name='delete_user'),
]