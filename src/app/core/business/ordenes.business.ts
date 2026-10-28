import { Orden } from '../models/orden.model';

/**
 * Reglas de negocio de la aplicación, escritas como funciones puras.
 *
 * - No dependen de Angular ni de la UI: se pueden probar de forma aislada.
 * - Nunca mutan el arreglo que reciben: devuelven uno nuevo, por lo que los
 *   datos originales siempre quedan intactos para limpiar o cambiar filtros.
 */

/** Único valor que define qué es "stock crítico" en toda la aplicación. */
export const LIMITE_STOCK_CRITICO = 5;

/** Tasa de IVA aplicada a la facturación (19 %). */
export const TASA_IVA = 0.19;

/** Criterios de ordenamiento del listado. */
export type Ordenamiento = 'id' | 'precioAsc' | 'precioDesc';

/** Filtros que el usuario puede modificar desde la interfaz. */
export interface FiltroOrdenes {
  busqueda: string;
  precioMin: number | null;
  precioMax: number | null;
  soloCriticos: boolean;
  ordenamiento: Ordenamiento;
}

/**
 * Valida el rango de precios del filtro.
 * Devuelve el mensaje de error o '' si el rango es válido.
 */
export function validarRangoPrecios(
  precioMin: number | null,
  precioMax: number | null
): string {
  if (precioMin !== null && precioMin < 0) {
    return 'El precio mínimo no puede ser negativo';
  }
  if (precioMin !== null && precioMax !== null && precioMin > precioMax) {
    return 'El precio mínimo no puede ser mayor que el máximo';
  }
  return '';
}

/**
 * Filtra por texto, rango de precio y stock crítico, y aplica el ordenamiento.
 * Si el rango de precios es inválido devuelve una lista vacía.
 */
export function filtrarOrdenes(
  ordenes: Orden[],
  filtro: FiltroOrdenes,
  limiteStock: number = LIMITE_STOCK_CRITICO
): Orden[] {
  if (validarRangoPrecios(filtro.precioMin, filtro.precioMax) !== '') {
    return [];
  }

  const texto = filtro.busqueda.trim().toLowerCase();
  const { precioMin, precioMax, soloCriticos, ordenamiento } = filtro;

  const resultado = ordenes.filter(
    (o) =>
      o.producto.toLowerCase().includes(texto) &&
      (precioMin === null || o.precio >= precioMin) &&
      (precioMax === null || o.precio <= precioMax) &&
      (!soloCriticos || o.stock < limiteStock)
  );

  switch (ordenamiento) {
    case 'precioAsc':
      return resultado.sort((a, b) => a.precio - b.precio);
    case 'precioDesc':
      return resultado.sort((a, b) => b.precio - a.precio);
    default:
      // 'id': orden explícito, no depende del orden que devuelva la API
      return resultado.sort((a, b) => a.id - b.id);
  }
}

/** Suma el monto total de las órdenes recibidas. */
export function sumarMonto(ordenes: Orden[]): number {
  return ordenes.reduce((acumulado, o) => acumulado + o.precio, 0);
}

/** Cuenta cuántas órdenes tienen stock por debajo del límite crítico. */
export function contarStockCritico(
  ordenes: Orden[],
  limite: number = LIMITE_STOCK_CRITICO
): number {
  return ordenes.filter((o) => o.stock < limite).length;
}

/** Calcula el IVA de un monto. */
export function calcularIva(monto: number, tasa: number = TASA_IVA): number {
  return monto * tasa;
}

/** Calcula el total de un monto más su IVA. */
export function calcularTotal(monto: number, tasa: number = TASA_IVA): number {
  return monto + calcularIva(monto, tasa);
}
