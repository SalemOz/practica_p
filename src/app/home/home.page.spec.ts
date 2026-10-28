import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HomePage } from './home.page';
import { OrdenesService } from '../ordenes.service';
import { Orden } from '../orden.model';

const ORDENES: Orden[] = [
  { id: 1, producto: 'Laptop gamer', descripcion: 'Notebook para juegos', precio: 1500, stock: 1 },
  { id: 2, producto: 'Mouse', descripcion: 'Periférico', precio: 300, stock: 10 },
];

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  // El servicio se mockea: los tests no tocan la red
  async function crearCon(servicio: { getOrdenes: () => any }) {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [{ provide: OrdenesService, useValue: servicio }],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // primer ciclo: dispara ngOnInit y la suscripción
    fixture.detectChanges(); // segundo ciclo: pinta lo que dejaron los signals
    return fixture;
  }

  const html = () => (fixture.nativeElement as HTMLElement).innerHTML;
  const productos = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('ion-list ion-item h2')]
      .map((h) => h.textContent?.trim());

  it('should create', async () => {
    await crearCon({ getOrdenes: () => of(ORDENES) });
    expect(component).toBeTruthy();
  });

  it('carga las órdenes y actualiza los signals de estado', async () => {
    await crearCon({ getOrdenes: () => of(ORDENES) });

    expect(component.cargando()).toBe(false);
    expect(component.errorCarga()).toBe('');
    expect(component.ordenes().length).toBe(2);
    expect(productos()).toEqual(['Laptop gamer', 'Mouse']);
    expect(html()).not.toContain('ion-spinner');
  });

  it('filtra el listado en tiempo real al escribir en la búsqueda', async () => {
    await crearCon({ getOrdenes: () => of(ORDENES) });

    component.busqueda = 'laptop'; // es lo que enlaza [(ngModel)] del ion-searchbar
    fixture.detectChanges();
    expect(productos()).toEqual(['Laptop gamer']);

    component.busqueda = '';
    fixture.detectChanges();
    expect(productos()).toEqual(['Laptop gamer', 'Mouse']);
  });

  it('filtra por rango de precio y valida el rango inválido', async () => {
    await crearCon({ getOrdenes: () => of(ORDENES) });

    component.precioMin = '200';
    component.precioMax = '1000';
    fixture.detectChanges();
    expect(productos()).toEqual(['Mouse']);
    expect(component.errorFiltro()).toBe('');

    component.precioMin = '2000'; // mínimo mayor que el máximo: filtro inválido
    fixture.detectChanges();
    expect(component.errorFiltro()).toContain('no puede ser mayor');
    expect(productos()).toEqual([]);

    component.limpiar();
    fixture.detectChanges();
    expect(component.errorFiltro()).toBe('');
    expect(productos()).toEqual(['Laptop gamer', 'Mouse']);
  });

  it('muestra el mensaje de error si la carga falla', async () => {
    await crearCon({ getOrdenes: () => throwError(() => new Error('sin conexión')) });

    expect(component.cargando()).toBe(false);
    expect(component.ordenes()).toEqual([]);
    expect(component.errorCarga()).toContain('No se pudieron cargar las órdenes');
    expect(html()).toContain('No se pudieron cargar las órdenes');
    expect(productos()).toEqual([]);
  });
});
