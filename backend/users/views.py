import json
import bcrypt
import jwt
import os
from datetime import datetime, timedelta

from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from bson.objectid import ObjectId
from django.conf import settings

from backend.mongo_client import users_collection
from backend.auth import JWTAuthMixin

JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = 'HS256'
JWT_EXP_DELTA_SECONDS = 86400

@method_decorator(csrf_exempt, name='dispatch')
class SignupView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            password = data.get('password')

            if not all([name, email, password]):
                return JsonResponse({'error': 'All fields are required'}, status=400)

            if users_collection.find_one({'email': email}):
                return JsonResponse({'error': 'Email already exists'}, status=400)

            hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

            user = {
                'name': name,
                'email': email,
                'password': hashed_pw.decode(),
                'profilepic': 'assets/images/default-profile.png',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }

            users_collection.insert_one(user)
            return JsonResponse({'message': 'User created successfully'}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class SigninView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            user = users_collection.find_one({'email': email})
            if not user or not bcrypt.checkpw(password.encode(), user['password'].encode()):
                return JsonResponse({'error': 'Invalid credentials'}, status=401)

            payload = {
                'user_id': str(user['_id']),
                'exp': datetime.utcnow() + timedelta(seconds=JWT_EXP_DELTA_SECONDS)
            }
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

            user.pop('password', None)
            user['_id'] = str(user['_id'])

            return JsonResponse({'message': 'Login successful', 'token': token, 'user': user})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class UpdateUserView(JWTAuthMixin, View):
    def post(self, request):
        try:
            user_id = request.user['_id']
            update_fields = {'updated_at': datetime.utcnow()}

            name = request.POST.get('name')
            email = request.POST.get('email')
            old_pw = request.POST.get('oldPassword')
            new_pw = request.POST.get('newPassword')

            if name:
                update_fields['name'] = name
            if email:
                update_fields['email'] = email
            if old_pw and new_pw:
                if not bcrypt.checkpw(old_pw.encode(), request.user['password'].encode()):
                    return JsonResponse({'error': 'Old password incorrect'}, status=401)
                update_fields['password'] = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()

            if 'profilepic' in request.FILES:
                pic = request.FILES['profilepic']
                filename = f"profile_{user_id}_{pic.name}"
                path = os.path.join('media', filename)
                with open(path, 'wb+') as f:
                    for chunk in pic.chunks():
                        f.write(chunk)
                update_fields['profilepic'] = filename

            users_collection.update_one({'_id': ObjectId(user_id)}, {'$set': update_fields})
            user = users_collection.find_one({'_id': ObjectId(user_id)})
            user['_id'] = str(user['_id'])
            user.pop('password', None)

            return JsonResponse({'message': 'User updated', 'user': user})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class DeleteUserView(JWTAuthMixin, View):
    def post(self, request):
        try:
            user_id = request.user['_id']
            result = users_collection.delete_one({'_id': ObjectId(user_id)})

            if result.deleted_count == 0:
                return JsonResponse({'error': 'User not found'}, status=404)

            return JsonResponse({'message': 'User deleted successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)