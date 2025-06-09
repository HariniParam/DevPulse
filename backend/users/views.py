import json
import bcrypt
import jwt
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bson.objectid import ObjectId
import os

from .mongo_client import users_collection
from django.conf import settings

JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = 'HS256'
JWT_EXP_DELTA_SECONDS = 3600

@csrf_exempt
def signup(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid HTTP method'}, status=405)
    try:
        data = json.loads(request.body)
        print("Incoming signup data:", data)  # 👈 TEMP LOG

        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not all([name, email, password]):
            return JsonResponse({'error': 'Name, email and password are required'}, status=400)

        if users_collection.find_one({'email': email}):
            return JsonResponse({'error': 'Email already exists'}, status=400)

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        user = {
            'name': name,
            'email': email,
            'password': hashed_password.decode('utf-8'),
            'profilepic': 'assets/images/default-profile.png',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        users_collection.insert_one(user)
        return JsonResponse({'message': 'User created successfully'}, status=201)

    except Exception as e:
        print("Signup Error:", str(e))  # 👈 TEMP LOG
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def signin(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid HTTP method'}, status=405)
    
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        if not all([email, password]):
            return JsonResponse({'error': 'Email and password are required'}, status=400)

        user = users_collection.find_one({'email': email})
        if not user:
            return JsonResponse({'error': 'User not found'}, status=404)

        # Check password using bcrypt
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return JsonResponse({'error': 'Invalid password'}, status=401)

        payload = {
            'user_id': str(user['_id']),
            'exp': datetime.utcnow() + timedelta(seconds=JWT_EXP_DELTA_SECONDS)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        # Remove password before sending response
        user.pop('password', None)

        # Convert ObjectId to string for JSON serialization
        user['_id'] = str(user['_id'])

        return JsonResponse({
            'message': 'Login successful',
            'token': token,
            'user': user
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
def update_user(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid HTTP method'}, status=405)

    try:
        user_id = request.POST.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'User ID required'}, status=400)

        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            return JsonResponse({'error': 'User not found'}, status=404)

        update_fields = {'updated_at': datetime.utcnow()}

        name = request.POST.get('name')
        email = request.POST.get('email')
        old_password = request.POST.get('oldPassword')
        new_password = request.POST.get('newPassword')

        if name and name != user.get('name'):
            update_fields['name'] = name
        if email and email != user.get('email'):
            update_fields['email'] = email

        if old_password and new_password:
            if not bcrypt.checkpw(old_password.encode(), user['password'].encode()):
                return JsonResponse({'error': 'Old password incorrect'}, status=401)
            hashed_pw = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
            update_fields['password'] = hashed_pw.decode()

        if 'profilepic' in request.FILES:
            profilepic = request.FILES['profilepic']
            filename = f"profile_{user_id}_{profilepic.name}"
            file_path = os.path.join('media', filename)
            with open(file_path, 'wb+') as dest:
                for chunk in profilepic.chunks():
                    dest.write(chunk)
            update_fields['profilepic'] = filename

        users_collection.update_one({'_id': ObjectId(user_id)}, {'$set': update_fields})

        updated_user = users_collection.find_one({'_id': ObjectId(user_id)})
        updated_user['_id'] = str(updated_user['_id'])
        updated_user.pop('password', None)

        return JsonResponse({'message': 'User updated successfully', 'user': updated_user})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
def delete_user(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid HTTP method'}, status=405)

    try:
        body = json.loads(request.body)
        user_id = body.get('user_id')

        if not user_id:
            return JsonResponse({'error': 'User ID is required'}, status=400)

        result = users_collection.delete_one({'_id': ObjectId(user_id)})

        if result.deleted_count == 0:
            return JsonResponse({'error': 'User not found'}, status=404)

        return JsonResponse({'message': 'User deleted successfully'})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
