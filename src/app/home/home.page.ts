import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonSpinner, IonText,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
  IonAvatar, IonBadge,
  IonSearchbar, IonInput, IonSelect, IonSelectOption, IonCheckbox, IonButton,
  IonModal, IonButtons, IonNote, ToastController,
} from '@ionic/angular';
import { Orden } from '../orden.model';
import { OrdenesService } from '../ordenes.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonSpinner, IonText,
    IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
    IonAvatar, IonBadge,
    IonSearchbar, IonInput, IonSelect, IonSelectOption, IonCheckbox, IonButton,
    IonModal, IonButtons, IonNote,
  ],
})
export class HomePage implements OnInit {
  /** Único lugar donde se define qué es "stock crítico" (lista, filtro y métricas). */
  readonly STOCK_CRITICO = 5;

  // --- Datos ---
  // Signals: en Angular sin zone.js (zoneless) solo una escritura de signal
  // programa un nuevo ciclo de change detection y refresca la vista.
  ordenes = signal<Orden[]>([]);
  cargando = signal(true);
  errorCarga = signal('');

  // --- Servicio ---
  private readonly service = inject(OrdenesService);

  private readonly toastCtrl = inject(ToastController);

  // --- Modal de facturación ---
  readonly IVA = 0.19;
  seleccionada = signal<Orden | null>(null);
  modalAbierto = signal(false);

  iva = computed(() => (this.seleccionada()?.precio ?? 0) * this.IVA);
  total = computed(() => (this.seleccionada()?.precio ?? 0) + this.iva());

  abrir(o: Orden) {
    this.seleccionada.set(o);
    this.modalAbierto.set(true);
  }

  cerrar() {
    this.modalAbierto.set(false);
  }

  async facturar() {
    const numero = this.seleccionada()?.id;
    this.modalAbierto.set(false);

    const toast = await this.toastCtrl.create({
      message: `Factura de la orden #${numero} generada correctamente`,
      duration: 2500,
      color: 'success',
      position: 'bottom',
    });
    await toast.present();
  }

  // --- Controles del filtro ---
  // Cada control expone un getter/setter para poder usar [(ngModel)] en la plantilla;
  // el estado real vive en un signal, así el listado se recalcula en tiempo real.
  private readonly _busqueda = signal('');
  get busqueda(): string { return this._busqueda(); }
  set busqueda(valor: string) { this._busqueda.set(valor); }

  private readonly _precioMin = signal<number | null>(null);
  get precioMin(): number | null { return this._precioMin(); }
  set precioMin(valor: number | string | null) { this._precioMin.set(this.aNumero(valor)); }

  private readonly _precioMax = signal<number | null>(null);
  get precioMax(): number | null { return this._precioMax(); }
  set precioMax(valor: number | string | null) { this._precioMax.set(this.aNumero(valor)); }

  private readonly _soloCriticos = signal(false);
  get soloCriticos(): boolean { return this._soloCriticos(); }
  set soloCriticos(valor: boolean) { this._soloCriticos.set(valor); }

  private readonly _ordenamiento = signal<'id' | 'precioAsc' | 'precioDesc'>('id');
  get ordenamiento(): 'id' | 'precioAsc' | 'precioDesc' { return this._ordenamiento(); }
  set ordenamiento(valor: 'id' | 'precioAsc' | 'precioDesc') { this._ordenamiento.set(valor); }

  // --- Derivados (computed) ---

  // Validación de los filtros: devuelve el mensaje de error o '' si todo está bien
  errorFiltro = computed(() => {
    const min = this.precioMin;
    const max = this.precioMax;
    if (min !== null && min < 0) {
      return 'El precio mínimo no puede ser negativo';
    }
    if (min !== null && max !== null && min > max) {
      return 'El precio mínimo no puede ser mayor que el máximo';
    }
    return '';
  });

  // Lista que se muestra: filtros + orden aplicados a las órdenes originales
  filtradas = computed(() => {
    if (this.errorFiltro()) return [];

    const texto = this.busqueda.trim().toLowerCase();
    const min = this.precioMin;
    const max = this.precioMax;

    const resultado = this.ordenes().filter(
      (o) =>
        o.producto.toLowerCase().includes(texto) &&
        (min === null || o.precio >= min) &&
        (max === null || o.precio <= max) &&
        (!this.soloCriticos || o.stock < this.STOCK_CRITICO)
    );

    switch (this.ordenamiento) {
      case 'precioAsc':
        return resultado.sort((a, b) => a.precio - b.precio);
      case 'precioDesc':
        return resultado.sort((a, b) => b.precio - a.precio);
      default:
        // 'id': orden explícito, no depende del orden que devuelva la API
        return resultado.sort((a, b) => a.id - b.id);
    }
  });

  // Métricas del dashboard: dependen de lo que se ve en pantalla
  totalMonto = computed(() =>
    this.filtradas().reduce((acc, o) => acc + o.precio, 0)
  );

  stockCritico = computed(
    () => this.filtradas().filter((o) => o.stock < this.STOCK_CRITICO).length
  );

  // --- Métodos ---

  limpiar() {
    this.busqueda = '';
    this.precioMin = null;
    this.precioMax = null;
    this.soloCriticos = false;
    this.ordenamiento = 'id';
  }

  // ngModel entrega strings desde los inputs: normalizamos a number | null
  // antes de guardarlo en el signal, así el resto de la clase solo ve números.
  private aNumero(valor: number | string | null): number | null {
    if (valor === null || valor === '') return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }

  ngOnInit() {
    this.service.getOrdenes().subscribe({
      next: (data) => {
        this.ordenes.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudieron cargar las órdenes. Revisa tu conexión.');
        this.cargando.set(false);
      },
    });
  }
}
