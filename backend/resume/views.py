from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import ResumeAnalyseSerializer
from .utils import AIDocumentAnalyzer
import time
from backend.mongo_client import resume_analysis_collection
from bson import ObjectId

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
            text = self.analyzer.extract_text(file)
            if len(text.strip()) < 50:
                return Response(
                    {"error": "Document content insufficient"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = self.analyzer.analyze_document(text)

            response_data = {
                "filename": file.name,
                "text_length": len(text),
                "overall_score": result.get("overall_score", 0),
                "subscores": result.get("subscores", {}),
                "recommendations": result.get("recommendations", ""),
                "processing_time": round(time.time() - start_time, 2),
                "timestamp": time.time()
            }

            insert_result = resume_analysis_collection.insert_one(response_data)
            response_data["_id"] = str(insert_result.inserted_id)  # serialize ObjectId

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