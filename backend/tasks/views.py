import json
from datetime import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from backend.mongo_client import tasks_collection
from backend.auth import JWTAuthMixin
from .serializers import TaskSerializer

@method_decorator(csrf_exempt, name='dispatch')
class TaskListCreateView(JWTAuthMixin, View):
    # To list all tasks for a user
    def get(self, request):
        user_id = request.user['_id']
        tasks = list(tasks_collection.find({'user_id': ObjectId(user_id)}))
        serialized = TaskSerializer.serialize_many(tasks)
        return JsonResponse(serialized, safe=False)

    # To create a new task
    def post(self, request):
        try:
            data = json.loads(request.body)
            task = {
                'title': data.get('title'),
                'description': data.get('description', ''),
                'scheduled_date': data.get('scheduled_date'),
                'status': data.get('status', 'TODO'),
                'user_id': ObjectId(request.user['_id']),
                'created_at': datetime.utcnow(),
                'modified_at': datetime.utcnow()
            }
            result = tasks_collection.insert_one(task)
            task['_id'] = result.inserted_id
            return JsonResponse(TaskSerializer.serialize(task), status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class TaskRetrieveUpdateDeleteView(JWTAuthMixin, View):
    # To retrieve a specific task
    def get(self, request, task_id):
        try:
            task = tasks_collection.find_one({'_id': ObjectId(task_id), 'user_id': ObjectId(request.user['_id'])})
            if not task:
                return JsonResponse({'error': 'Task not found'}, status=404)
            return JsonResponse(TaskSerializer.serialize(task))
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    # To update a specific task
    def put(self, request, task_id):
        try:
            data = json.loads(request.body)
            updated = {
                'modified_at': datetime.utcnow()
            }
            for field in ['title', 'description', 'scheduled_date', 'status']:
                if field in data:
                    updated[field] = data[field]

            result = tasks_collection.update_one(
                {'_id': ObjectId(task_id), 'user_id': ObjectId(request.user['_id'])},
                {'$set': updated}
            )
            if result.matched_count == 0:
                return JsonResponse({'error': 'Task not found'}, status=404)

            task = tasks_collection.find_one({'_id': ObjectId(task_id)})
            return JsonResponse(TaskSerializer.serialize(task))
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    # To delete a specific task
    def delete(self, request, task_id):
        try:
            result = tasks_collection.delete_one({'_id': ObjectId(task_id), 'user_id': ObjectId(request.user['_id'])})
            if result.deleted_count == 0:
                return JsonResponse({'error': 'Task not found'}, status=404)
            return JsonResponse({'message': 'Task deleted successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)