// Las fechas se enseñan siempre en hora de Madrid, la misma con la que se fijan los cambios de criterio
const ZONA_HORARIA = 'Europe/Madrid';

export const formatearFecha = (valor, { conHora = true } = {}) => {
  const fecha = new Date(valor);
  if (!valor || Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return fecha.toLocaleString('es-ES', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

const PORCENTAJE = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 });
const CONFIANZA = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ENTERO = new Intl.NumberFormat('es-ES');

// Recibe una proporción entre 0 y 1
export const formatearPorcentaje = (valor) => (Number.isFinite(valor) ? PORCENTAJE.format(valor) : '—');

export const formatearConfianza = (valor) => (Number.isFinite(valor) ? CONFIANZA.format(valor) : '—');

export const formatearEntero = (valor) => (Number.isFinite(valor) ? ENTERO.format(valor) : '—');

// La marca de agua es texto libre que escribe quien usa la web. Si alguien puso su DNI, su NIE
// o un teléfono, el panel no lo enseña. Tapa cualquier serie de 7 o más cifras, con la letra del NIE
// delante y la de control detrás si van pegadas
const PARECE_NUMERO_PERSONAL = /(?:[XYZ][\s.-]?)?\d(?:[\s.-]?\d){6,}(?:[\s-]?[A-Z]\b)?/gi;

export const taparNumeros = (texto) =>
  typeof texto === 'string' ? texto.replace(PARECE_NUMERO_PERSONAL, '[número oculto]') : texto;
