import requests
import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

@csrf_exempt
def get_news(request):
    query = request.GET.get('q', 'jobs OR hackathon OR placement OR career OR competition')
    api_key = settings.NEWS_API
    url = 'https://newsapi.org/v2/everything'

    params = {
        'q': query,
        'language': 'en',
        'pageSize': 15,
        'apiKey': api_key,
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return JsonResponse(response.json()['articles'], safe=False)
    except requests.RequestException:
        return JsonResponse({'error': 'Failed to fetch news'}, status=500)
