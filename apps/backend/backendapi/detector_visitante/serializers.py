from rest_framework import serializers

class VisitorSerializer(serializers.Serializer):
    id = serializers.CharField()
    full_name = serializers.CharField()
    doc_type = serializers.CharField()
    doc_number = serializers.CharField()
    phone = serializers.CharField(allow_null=True, required=False)
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    images = serializers.ListField(child=serializers.CharField(), required=False)