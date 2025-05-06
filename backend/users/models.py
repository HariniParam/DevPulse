from django.db import models

# Create your models here.
class Users(models.Model):
    name = models.CharField(max_length=100,unique = True)
    email = models.EmailField(max_length=100,unique=True)
    password = models.CharField(max_length=100)
    profilepic = models.ImageField(default='profilepic/default.jpg')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)