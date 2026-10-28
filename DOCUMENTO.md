# Documento explicativo del proyecto

## E-Commerce: Gestión de órdenes de compra

Prototipo de aplicación móvil híbrida desarrollado con **Ionic 9 + Angular 22 (componentes standalone + signals)** y **Capacitor**, que consume datos remotos de una API REST, aplica reglas de negocio en TypeScript y presenta una interfaz adaptable a móviles y tabletas.

---

## 1. Stack tecnológico

| Tecnología | Versión | Uso en el proyecto |
|---|---|---|
| Angular | 22.2.3 | Framework base, componentes standalone, signals y `computed` |
| Ionic Angular | 9.x | Componentes de UI (header, cards, list, modal, toast, etc.) |
| RxJS | 7.8 | Manejo de la petición HTTP con `Observable` y `map` |
| TypeScript | 6.x | Modelo de datos y lógica de negocio |
| Capacitor | 8.x | Empaquetado como app móvil |
| Vitest / Angular testing | — | Pruebas unitarias (`npm test`) |
| ESLint | — | Análisis estático (`npm run lint`) |

---

## 2. Estructura del proyecto

```
src/
├── app/
│   ├── app.component.ts / app.component.html   # Componente raíz (router-outlet)
│   ├── app.routes.ts                           # Rutas: '' → redirect a 'home'
│   ├── orden.model.ts                          # Modelo TypeScript de la orden
│   ├── ordenes.service.ts                      # Servicio HTTP (@Injectable + HttpClient)
│   └── home/
│       ├── home.page.ts                        # Componente: filtros, lógica de negocio, modal, toast
│       ├── home.page.html                      # Plantilla: dashboard, filtro, listado, modal
│       ├── home.page.scss                      # Estilos de la página
│       └── home.page.spec.ts                   # Pruebas unitarias
├── environments/                                # Configuración de entornos
└── main.ts                                     # Punto de entrada de la aplicación
```

---

## 3. Modelo de datos (`src/app/orden.model.ts`)

```ts
export interface Orden {
  id: number;
  producto: string;
  descripcion: string;
  precio: number;
  stock: number;
}
```

El endpoint asignado (`https://jsonplaceholder.typicode.com/posts`) devuelve **publicaciones** (`userId`, `id`, `title`, `body`), no órdenes con precio ni inventario. Como indica el enunciado, se adapta la respuesta al modelo de la aplicación generando localmente los atributos necesarios para demostrar la regla de negocio:

- `producto` ← `title`
- `descripcion` ← `body`
- `precio` ← valor derivado del `id` (rango determinista, mismo id siempre produce el mismo precio)
- `stock` ← valor derivado del `id` (0 a 19, para poder mostrar ítems con stock crítico)

---

## 4. Servicio HTTP (`src/app/ordenes.service.ts`)

- Clase marcada con **`@Injectable({ providedIn: 'root' })`** → inyectable en toda la app.
- Inyecta **`HttpClient`** con `inject(HttpClient)`.
- Expone `getOrdenes(): Observable<Orden[]>` que hace **GET** al endpoint asignado.
- Transforma la respuesta con **`map()`** de RxJS al modelo `Orden[]`.

```ts
@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly url = 'https://jsonplaceholder.typicode.com/posts';
  private readonly http = inject(HttpClient);

  getOrdenes(): Observable<Orden[]> {
    return this.http.get<Post[]>(this.url).pipe(
      map((posts) => posts.map((p) => ({
        id: p.id,
        producto: p.title,
        descripcion: p.body,
        precio: 1000 + ((p.id % 3700) % 90000),
        stock: (p.id * 7) % 20,
      })))
    );
  }
}
```

El componente lo consume en `ngOnInit()` manejando los tres estados: carga (`cargando`), éxito (`ordenes`) y error (`errorCarga`).

---

## 5. Dashboard e interfaz responsiva (`home.page.html`)

- **`ion-header` + `ion-toolbar` + `ion-title`** con el título "Órdenes de compra".
- Dos **`ion-card`** dentro de un **`ion-grid`** con métricas calculadas dinámicamente:
  - **Monto total**: suma de los precios de lo que se está viendo en pantalla (formato moneda COP).
  - **Órdenes con stock crítico**: contador que se pinta en rojo cuando es mayor a 0.
- Adaptación móvil/tableta con `size="12" sizeMd="6"` (las tarjetas ocupan el 100 % en móvil y 50 % en tablet). El filtro usa `sizeMd="4"` para tres columnas en tablet.

```html
<ion-grid>
  <ion-row>
    <ion-col size="12" sizeMd="6">
      <ion-card> ... Monto total ... </ion-card>
    </ion-col>
    <ion-col size="12" sizeMd="6">
      <ion-card> ... Stock crítico ... </ion-card>
    </ion-col>
  </ion-row>
</ion-grid>
```

---

## 6. Filtro interactivo con `[(ngModel)]`

Controles Ionic dentro de una tarjeta de filtro, todos enlazados con **`[(ngModel)]`** (two-way binding, `FormsModule` importado en el componente):

| Control | Propiedad enlazada | Función |
|---|---|---|
| `ion-searchbar` (`[debounce]="0"`) | `busqueda` | Búsqueda en tiempo real por nombre de producto |
| `ion-input type="number"` | `precioMin` | Precio mínimo del rango |
| `ion-input type="number"` | `precioMax` | Precio máximo del rango |
| `ion-select` | `ordenamiento` | Orden: ID, precio ascendente o descendente |
| `ion-checkbox` | `soloCriticos` | Muestra solo las órdenes con stock < 5 |

Además:

- **Validación de campos**: `errorFiltro` (un `computed`) detecta precio mínimo negativo o mínimo mayor que máximo; muestra el mensaje en rojo con `ion-text color="danger"` y marca los inputs con la clase `ion-invalid`.
- **Botón "Limpiar filtros"**: reinicia todos los controles y restaura el listado completo.
- Los controles exponen **getter/setter** que envuelven un signal privado, de modo que `[(ngModel)]` puede asignarlos y, al mismo tiempo, cada escritura programa un nuevo ciclo de change detection (app *zoneless*) y la lista se actualiza en tiempo real.
- El setter de precio normaliza el string que llega del input a `number | null` (método `aNumero`).

```html
<ion-searchbar placeholder="Buscar producto…" [debounce]="0" [(ngModel)]="busqueda"></ion-searchbar>
<ion-input type="number" label="Precio mínimo" [(ngModel)]="precioMin"></ion-input>
<ion-select label="Ordenar por" [(ngModel)]="ordenamiento">...</ion-select>
<ion-checkbox [(ngModel)]="soloCriticos"></ion-checkbox>
```

---

## 7. Listado e indicadores

- **`ion-list` + `ion-item`** (con `button detail`): al hacer clic se abre el modal.
- **`ion-avatar`** con imagen al inicio de cada fila.
- **Texto principal** (`h2`): nombre del producto. **Texto secundario** (`p`): precio formateado en COP.
- **`ion-badge` con color condicional**: rojo (`danger`) cuando `stock < 5`, verde (`success`) en caso contrario:

```html
<ion-badge slot="end" [color]="o.stock < STOCK_CRITICO ? 'danger' : 'success'">
  Stock: {{ o.stock }}
</ion-badge>
```

- Estados de la vista: spinner mientras carga, mensaje de error si falla el GET, listado de resultados, y mensaje "No hay órdenes que coincidan con los filtros" cuando el filtro no arroja resultados.

---

## 8. Lógica de negocio (métodos de arreglo en TypeScript)

Todo vive en `home.page.ts` y opera sobre los **datos originales** (`ordenes`, sin mutar), por lo que modificar o limpiar los filtros siempre restaura el listado completo:

| Método | Dónde | Para qué |
|---|---|---|
| `filter()` | `filtradas` | Filtra por texto, rango de precio y stock crítico |
| `sort()` | `filtradas` | Ordena por ID, precio ascendente o descendente |
| `filter()` + `reduce()` | `stockCritico`, `totalMonto` | Conteo de stock crítico y suma del monto total |
| `map()` | `OrdenesService` | Transforma los `posts` de la API a `Orden[]` |

```ts
filtradas = computed(() => {
  if (this.errorFiltro()) return [];
  const resultado = this.ordenes().filter((o) =>
    o.producto.toLowerCase().includes(texto) &&
    (min === null || o.precio >= min) &&
    (max === null || o.precio <= max) &&
    (!this.soloCriticos || o.stock < this.STOCK_CRITICO)
  );
  switch (this.ordenamiento) { /* sort por precio o id */ }
});
```

**Regla de negocio obligatoria**: filtrar por rango de precio/monto e identificar productos con stock crítico; la insignia es roja cuando el stock es menor que 5. La constante `STOCK_CRITICO = 5` es la única fuente de verdad (lista, filtro y métricas la usan).

Las métricas del dashboard (`totalMonto`, `stockCritico`) dependen de `filtradas`, es decir, reflejan lo que se ve en pantalla en cada momento.

---

## 9. Modal de facturación y notificación

- Al seleccionar una orden se abre un **`ion-modal`** controlado por la signal `modalAbierto` (`[isOpen]`), con `(didDismiss)` para sincronizar el cierre.
- El modal muestra el desglose: producto, descripción, **Subtotal**, **IVA (19 %)** y **Total**, calculados con `computed`:

```ts
readonly IVA = 0.19;
iva = computed(() => (this.seleccionada()?.precio ?? 0) * this.IVA);
total = computed(() => (this.seleccionada()?.precio ?? 0) + this.iva());
```

- **Botón de acción "Facturar"**: cierra el modal y muestra un **`ToastController`** con mensaje de confirmación durante **2500 ms** (`duration: 2500`).

```ts
async facturar() {
  this.modalAbierto.set(false);
  const toast = await this.toastCtrl.create({
    message: `Factura de la orden #${numero} generada correctamente`,
    duration: 2500, color: 'success', position: 'bottom',
  });
  await toast.present();
}
```

---

## 10. Pruebas unitarias (`home.page.spec.ts`)

Se mockea `OrdenesService` para que las pruebas no tocan la red. 6 pruebas, todas en verde:

1. El componente se crea correctamente.
2. Carga las órdenes y actualiza los signals de estado (y pinta la lista).
3. Muestra el mensaje de error si la carga falla.
4. **Filtra el listado en tiempo real** al escribir en la búsqueda (enlazado con `[(ngModel)]`).
5. **Filtra por rango de precio** y valida un rango inválido (mín > máx), y `limpiar()` restaura el listado.
6. (Cobertura del estado vacío del filtro.)

```bash
npm test   # Test Files 2 passed | Tests 6 passed
```

---

## 11. Cómo ejecutar el proyecto

```bash
npm install
npm start        # http://localhost:4200
npm run build    # compilación de producción (www/)
npm test         # pruebas unitarias
npm run lint     # análisis con ESLint
```

---

## 12. Checklist de verificación previa a la entrega

- ☑ Inicia la aplicación (`npm start` → build sin errores).
- ☑ Funciona el filtro (búsqueda, rango de precio, orden y stock crítico en tiempo real, con validación).
- ☑ Abre y cierra el modal (clic en una orden / botón Cerrar y `didDismiss`).
- ☑ Se muestra el Toast de 2,5 segundos al facturar.
- ☑ El repositorio contiene el código fuente (pendiente: hacer commit y subir al remoto).

---

## 13. Decisiones de diseño relevantes

1. **Signals + `computed` en lugar de suscripciones manuales**: el estado (`ordenes`, filtros) son signals y las listas/métricas derivan de ellos con `computed`, lo que elimina recálculos manuales y funciona bien en Angular *zoneless*.
2. **Datos originales intactos**: `filtradas` siempre parte de `ordenes()`, nunca muta el arreglo original, por lo que limpiar filtros siempre restaura el listado completo.
3. **Adaptación de los datos de prueba**: el endpoint no trae precios ni stock, así que se derivan de forma determinista del `id` para poder demostrar la regla de negocio de forma reproducible.
4. **Constante única de stock crítico** (`STOCK_CRITICO = 5`) para no repetir el número 5 en la plantilla, el filtro y las métricas.
