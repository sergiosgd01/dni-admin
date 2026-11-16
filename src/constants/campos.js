// Perfiles del editor de la web, con el color de su etiqueta
export const PERFILES = {
  viajes: { nombre: 'Viajes', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  salud: { nombre: 'Salud', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  administrativo: { nombre: 'Administrativo', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  financiero: { nombre: 'Financiero', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  personalizado: { nombre: 'Personalizado', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

export const perfilDe = (id) => (id ? PERFILES[id] || PERFILES.personalizado : null);

// Las 20 casillas del editor de la web, en el mismo orden, con la clave que llega en hiddenFields
export const CAMPOS_TAPABLES = [
  {
    grupo: 'frontFields',
    titulo: 'Anverso',
    campos: [
      ['nombre', 'Nombre'],
      ['apellidos', 'Apellidos'],
      ['dni', 'Número de DNI'],
      ['fechaNacimiento', 'Fecha de nacimiento'],
      ['sexo', 'Sexo'],
      ['nacionalidad', 'Nacionalidad'],
      ['fechaExpedicion', 'Fecha de expedición'],
      ['fechaCaducidad', 'Fecha de caducidad'],
      ['numeroSoporte', 'Número de soporte'],
      ['can', 'CAN'],
      ['firma', 'Firma'],
      ['cli', 'CLI (imagen láser cambiante)'],
    ],
  },
  {
    grupo: 'backFields',
    titulo: 'Reverso',
    campos: [
      ['mrz', 'MRZ'],
      ['domicilio', 'Domicilio'],
      ['municipio', 'Municipio'],
      ['provincia', 'Provincia'],
      ['lugarNacimiento', 'Lugar de nacimiento'],
      ['equipoExpedidor', 'Equipo expedidor'],
      ['progenitores', 'Progenitores'],
      ['ventanaSoporte', 'Número de soporte (ventana)'],
    ],
  },
];

// Día desde el que el backend guarda cada métrica, sacado de los commits de dni-backend y de la web.
// En los registros anteriores Mongoose rellena al leerlos el valor por defecto del esquema,
// así que lo que llega no dice nada de ese procesado. Como no se sabe a qué hora se publicó
// cada cambio, los registros de ese mismo día quedan en duda.
const GUARDADO_DESDE = {
  // dni-backend 5117d53 y web 580fad0. Hasta entonces la web no enviaba los campos tapados.
  // Las casillas ya se habían invertido el 15/01/2026 (web be421d6), así que todo lo guardado
  // lleva true = tapado, aunque el esquema diga que antes era true = visible
  hiddenFields: '2026-01-26',
  // dni-backend b927906
  manualDetection: '2026-01-29',
  // dni-backend e38b653. Antes se guardaba como sí o no
  homogenityPassed: '2026-01-29',
};

const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Dice si el valor de una métrica en un registro es de verdad o el valor por defecto.
 * @returns {'fiable'|'dudosa'|'sin-datos'}
 */
export const fiabilidadMetrica = (registro, metrica) => {
  const desde = GUARDADO_DESDE[metrica];
  if (!desde) return 'fiable';

  const fecha = Date.parse(registro?.createdAt);
  if (!Number.isFinite(fecha)) return 'dudosa';

  const inicio = Date.parse(`${desde}T00:00:00+01:00`);
  if (fecha < inicio) return 'sin-datos';
  if (fecha < inicio + UN_DIA) return 'dudosa';
  return 'fiable';
};

// Hasta CEN-1 (web 6650231, 13/11/2026 a las 14:05) los perfiles predefinidos tapaban lo contrario de lo que prometían.
// hiddenFields guarda lo que se tapó de verdad, pero no coincide con el nombre del perfil.
// El despliegue terminó hacia las 14:07, y una pestaña abierta antes pudo seguir con la web vieja, así que el resto
// del 13/11 queda como dudoso, igual que en fiabilidadMetrica.
// Los registros con detección por campo vienen de una versión de la web posterior, con los perfiles ya corregidos.
const INICIO_CORRECCION_PERFILES = Date.parse('2026-11-13T14:05:00+01:00');
const FIN_PERFILES_INVERTIDOS = Date.parse('2026-11-14T00:00:00+01:00');

/**
 * Dice si el perfil predefinido de un registro tapaba lo contrario de lo que prometía.
 * @returns {'invertido'|'dudoso'|null}
 */
export const perfilInvertido = (registro) => {
  const fecha = Date.parse(registro?.createdAt);
  const conPerfil = Boolean(registro?.profileUsed) && registro.profileUsed !== 'personalizado';
  if (registro?.deteccion || !conPerfil || !Number.isFinite(fecha) || fecha >= FIN_PERFILES_INVERTIDOS) return null;
  return fecha < INICIO_CORRECCION_PERFILES ? 'invertido' : 'dudoso';
};
