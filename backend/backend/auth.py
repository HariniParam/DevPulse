import jwt
from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from bson.objectid import ObjectId
from backend.mongo_client import users_collection

@method_decorator(csrf_exempt, name='dispatch')
class JWTAuthMixin:
    def dispatch(self, request, *args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authorization header missing or invalid'}, status=401)

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                return JsonResponse({'error': 'Invalid token payload'}, status=401)

            user = users_collection.find_one({'_id': ObjectId(user_id)})
            if not user:
                return JsonResponse({'error': 'User not found'}, status=404)

            request.user = user
            return super().dispatch(request, *args, **kwargs)

        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token has expired'}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({'error': 'Invalid token'}, status=401)