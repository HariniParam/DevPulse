from pymongo import MongoClient
from django.conf import settings

MONGO_URI = settings.MONGO_URI

client = MongoClient(MONGO_URI)
db = client['devpulse']
users_collection = db['users']
tasks_collection = db['tasks']