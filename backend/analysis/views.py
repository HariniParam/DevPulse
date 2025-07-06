from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bson.objectid import ObjectId
from pymongo import MongoClient
from django.conf import settings
from backend.mongo_client import test_attempts_collection

@csrf_exempt
def get_test_analysis(request, test_id):
    try:
        test = test_attempts_collection.find_one({"_id": ObjectId(test_id)})
        if not test:
            return JsonResponse({"error": "Test not found"}, status=404)
        test['_id'] = str(test['_id'])
        return JsonResponse(test, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
