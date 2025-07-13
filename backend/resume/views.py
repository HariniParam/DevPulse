import base64
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import ResumeAnalyseSerializer
from .utils import AIDocumentAnalyzer
import time
import gridfs
from bson import ObjectId
from backend.mongo_client import resume_analysis_collection,db  
from urllib.parse import quote_plus

fs = gridfs.GridFS(db)

class ResumeAnalyseAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        try:
            self.analyzer = AIDocumentAnalyzer()
        except Exception:
            self.analyzer = None

    def post(self, request):
        start_time = time.time()

        serializer = ResumeAnalyseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request data", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not self.analyzer:
            return Response(
                {"error": "Service unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        file = serializer.validated_data['file']
        max_size = 5 * 1024 * 1024
        if file.size > max_size:
            return Response(
                {"error": "File too large", "details": "Maximum file size is 5MB"},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            )

        try:
            file_id = fs.put(file, filename=file.name, content_type=file.content_type)
            text = self.analyzer.extract_text(file)
            if len(text.strip()) < 50:
                return Response(
                    {"error": "Document content insufficient"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            user_id = serializer.validated_data.get("user_id")

            result = self.analyzer.analyze_document(text)

            response_data = {
                "filename": file.name,
                "file_id": str(file_id),
                "user_id": user_id, 
                "text_length": len(text),
                "overall_score": result.get("overall_score", 0),
                "subscores": result.get("subscores", {}),
                "recommendations": result.get("recommendations", ""),
                "processing_time": round(time.time() - start_time, 2),
                "timestamp": time.time()
            }

            insert_result = resume_analysis_collection.insert_one(response_data)
            response_data["_id"] = str(insert_result.inserted_id)

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": "Processing failed", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request):
        return Response({
            "message": "Resume Analysis API",
            "supported_formats": ["PDF", "TXT"],
            "max_file_size": "5MB"
        })

class LatestResumeAnalysisAPIView(APIView):
    def get(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "Missing user_id"}, status=status.HTTP_400_BAD_REQUEST)

        latest_doc = resume_analysis_collection.find_one(
            {"user_id": user_id},
            sort=[('timestamp', -1)]
        )
        if not latest_doc:
            return Response({"message": "No resume analysis found"}, status=status.HTTP_404_NOT_FOUND)

        latest_doc["_id"] = str(latest_doc["_id"])
        file_id = latest_doc.get("file_id", "")
        latest_doc["file_id"] = str(file_id)

        if file_id:
            try:
                file = fs.get(ObjectId(file_id))
                file_content = file.read()
                encoded_pdf = base64.b64encode(file_content).decode('utf-8')
                latest_doc["pdf_base64"] = encoded_pdf
                latest_doc["pdf_content_type"] = file.content_type 
                latest_doc["filename"] = file.filename
            except Exception as e:
                return Response(
                    {"error": "Failed to load PDF from DB", "details": str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response(latest_doc, status=status.HTTP_200_OK)
