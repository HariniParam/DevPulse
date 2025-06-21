from bson import ObjectId

class TaskSerializer:
    @staticmethod
    def serialize(task):
        return {
            "id": str(task.get('_id')),
            "title": task.get('title'),
            "description": task.get('description'),
            "scheduled_date": task.get('scheduled_date'),
            "status": task.get('status'),
            "created_at": task.get('created_at'),
            "modified_at": task.get('modified_at'),
            "user_id": str(task.get('user_id')),
        }

    @staticmethod
    def serialize_many(tasks):
        return [TaskSerializer.serialize(task) for task in tasks]