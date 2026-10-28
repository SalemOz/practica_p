import { Injectable, inject } from '@angular/core'; //marca la clase como servicio inyectable y disponible en toda la aplicación
import { Orden } from './orden.model';
import { Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http'; //herramienta de angular para hacer peticiones HTTP

interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly url = 'https://jsonplaceholder.typicode.com/posts';

  private readonly http = inject(HttpClient);

  getOrdenes(): Observable<Orden[]> {
    return this.http.get<Post[]>(this.url).pipe(
      map((posts) =>
        posts.map((p) => ({
          id: p.id,
          producto: p.title,
          descripcion: p.body,
          precio: 1000 + ((p.id % 3700) % 90000),
          stock: (p.id * 7) % 20,
        }))
      )
    );
  }
}
