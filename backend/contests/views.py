import requests
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

@method_decorator(csrf_exempt, name='dispatch')
class ContestListView(View):
    def get(self, request):
        try:
            url = 'https://competeapi.vercel.app/contests/upcoming/'
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            return JsonResponse(data, safe=False)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': str(e)}, status=500)
