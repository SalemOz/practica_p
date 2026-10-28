import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonSpinner, IonText,
  IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
  IonAvatar, IonBadge,
  IonSearchbar, IonInput, IonSelect, IonSelectOption, IonCheckbox,
  IonButton, IonButtons, IonModal, IonNote,
  ToastController,
} from '@ionic/angular';

import { Orden } from '../../core/models/orden.model';
import { OrdenesService } from '../../core/services/ordenes.service';
import {
  LIMITE_STOCK_CRITICO,
  Ordenamiento,
  calcularIva,
  calcularTotal,
  contarStockCritico,
  filtrarOrdenes,
  sumarMonto,
  validarRangoPrecios,
} from '../../core/business/ordenes.business';

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
    IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
    IonAvatar, IonBadge,
    IonSearchbar, IonInput, IonSelect, IonSelectOption, IonCheckbox,
    IonButton, IonButtons, IonModal, IonNote,
  ],
})
export class HomePage implements OnInit {
  /** Valor de "stock crítico" visible en la plantilla (lista, filtro y métricas). */
  readonly STOCK_CRITICO = LIMITE_STOCK_CRITICO;

  // --- Estado de la página ---
  // En Angular sin zone.js (zoneless) una escritura de signal programa un
  // nuevo ciclo de change detection y refresca la vista.
  ordenes = signal<Orden[]>([]);
  cargando = signal(true);
  errorCarga = signal('');

  // --- Dependencias ---
  private readonly ordenesService = inject(OrdenesService);
  private readonly toastCtrl = inject(ToastController);

  // --- Modal de facturación ---
  seleccionada = signal<Orden | null>(null);
  modalAbierto = signal(false);

  iva = computed(() => calcularIva(this.seleccionada()?.precio ?? 0));
  total = computed(() => calcularTotal(this.seleccionada()?.precio ?? 0));

  // --- Controles del filtro ---
  // Cada control expone un getter/setter para poder usar [(ngModel)] en la
  // plantilla; el estado real vive en un signal, así el listado se recalcula
  // en tiempo real.
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

  private readonly _ordenamiento = signal<Ordenamiento>('id');
  get ordenamiento(): Ordenamiento { return this._ordenamiento(); }
  set ordenamiento(valor: Ordenamiento) { this._ordenamiento.set(valor); }

  // --- Valores derivados (computed) ---
  // Validación de los filtros: mensaje de error o '' si todo está bien.
  errorFiltro = computed(() => validarRangoPrecios(this.precioMin, this.precioMax));

  // Lista visible: filtros + orden aplicados sobre los datos originales.
  filtradas = computed(() =>
    filtrarOrdenes(this.ordenes(), {
      busqueda: this.busqueda,
      precioMin: this.precioMin,
      precioMax: this.precioMax,
      soloCriticos: this.soloCriticos,
      ordenamiento: this.ordenamiento,
    })
  );

  // Métricas del dashboard: dependen de lo que se ve en pantalla.
  totalMonto = computed(() => sumarMonto(this.filtradas()));
  stockCritico = computed(() => contarStockCritico(this.filtradas()));

  // --- Acciones ---

  abrir(o: Orden) {
    this.seleccionada.set(o);
    this.modalAbierto.set(true);
  }

  cerrar() {
    this.modalAbierto.set(false);
  }

  /** Cierra el modal y confirma la acción con un toast de 2,5 segundos. */
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
    this.ordenesService.getOrdenes().subscribe({
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
