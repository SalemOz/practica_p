# E-Commerce: Gestión de órdenes de compra

Prototipo de aplicación móvil híbrida (Ionic + Angular) para la gestión de órdenes
de compra. Los datos se consumen desde `https://jsonplaceholder.typicode.com/posts`
y se adaptan localmente al modelo `Orden` (producto, descripción, precio y stock)
para poder aplicar la regla de negocio de stock crítico y rango de precios.

## Requisitos

- Node.js 20 o superior
- npm

## Instalación y ejecución

```bash
npm install
npm start
```

Luego abre `http://localhost:4200/` en el navegador.

## Otras tareas

```bash
npm run build   # compila la aplicación para producción
npm test        # ejecuta las pruebas unitarias
npm run lint    # analiza el código con ESLint
```

## Funcionalidades

- **Dashboard responsivo**: `ion-header`, `ion-toolbar` y tarjetas `ion-card` dentro
  de un `ion-grid` con adaptación a móvil/tablet (`size` / `sizeMd`) que muestran el
  monto total y la cantidad de órdenes con stock crítico, calculados dinámicamente.
- **Servicio HTTP**: `OrdenesService` (`@Injectable` + `HttpClient`) realiza el GET
  al endpoint y transforma la respuesta a `Orden[]` con RxJS `map`.
- **Filtro interactivo**: `ion-searchbar`, `ion-input`, `ion-select` e `ion-checkbox`
  enlazados con `[(ngModel)]`; la lista se actualiza en tiempo real y valida el rango
  de precios (mínimo no negativo ni mayor que el máximo).
- **Listado**: `ion-list` / `ion-item` con `ion-avatar`, texto principal/secundario y
  `ion-badge` rojo (`danger`) cuando el stock es menor que 5.
- **Lógica de negocio**: `filter()`, `sort()`, `reduce()` y `map()` en TypeScript,
  conservando los datos originales para limpiar o modificar los filtros.
- **Modal de facturación**: `ion-modal` con el desglose de la orden, IVA del 19 % y
  total; al facturar se cierra y se muestra un `ToastController` durante 2500 ms.
