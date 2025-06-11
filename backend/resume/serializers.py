from rest_framework import serializers
import os

class ResumeAnalyseSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)

    def validate_file(self, value):
        # Check file size (max 5MB)
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(f"File size exceeds 5MB limit.")

        # Check file size (min 10KB)
        min_size = 10 * 1024
        if value.size < min_size:
            raise serializers.ValidationError("File is too small. Minimum size is 10KB.")

        # Check file extension
        allowed_extensions = ['.pdf', '.txt']
        extension = os.path.splitext(value.name)[1].lower()
        if extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"Unsupported file format: {extension}. Allowed formats: {', '.join(sorted(allowed_extensions))}"
            )

        return value