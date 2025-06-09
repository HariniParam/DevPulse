from pymongo import MongoClient
from django.conf import settings

MONGO_URI = settings.MONGO_URI

client = MongoClient(MONGO_URI)
db = client['devpulse']  # Replace with your DB name
users_collection = db['users']
