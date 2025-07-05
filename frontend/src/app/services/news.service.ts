import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

export interface Article {
  title: string;
  url: string;
  urlToImage?: string;
  source: { name: string };
  description: string;
  author: string;
  publishedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private backendUrl = 'http://localhost:8000/news';

  constructor(private http: HttpClient) {}

  getNews(query: string = 'jobs OR hackathon OR competition OR placement OR career'): Observable<Article[]> {
    const cached = sessionStorage.getItem('cachedNews');
    if (cached) {
      return of(JSON.parse(cached));
    }

    const params = new HttpParams().set('q', query);
    return this.http.get<Article[]>(this.backendUrl, { params }).pipe(
      tap((articles) => sessionStorage.setItem('cachedNews', JSON.stringify(articles)))
    );
  }

  //to remove stored news
  clearCache(): void {
    sessionStorage.removeItem('cachedNews');
  }
}
