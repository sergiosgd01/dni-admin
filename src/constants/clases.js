// Clases del detector de campos de la web (CLASS_NAMES en ProyectoDNI/src/components/dni_scripts/dni_detector.jsx),
// con el nombre que se enseña en el panel
export const CLASES = {
  APELLIDOS: 'Apellidos',
  CAN: 'CAN',
  CLI: 'CLI (imagen láser cambiante)',
  DOC_DNI: 'Documento (anverso)',
  DOC_DNI_REV: 'Documento (reverso)',
  DOMICILIO: 'Domicilio',
  EMISIÓN: 'Fecha de expedición',
  EQUIPO: 'Equipo expedidor',
  ES: 'Elemento de seguridad ES',
  ESP: 'Elemento de seguridad ESP',
  ESP_HOLO: 'Holograma',
  FIRMA: 'Firma',
  FOTOGRAFIA: 'Fotografía',
  HIJO_DE: 'Progenitores',
  LUGAR_NACIMIENTO: 'Lugar de nacimiento',
  MRZ: 'MRZ (zona de lectura mecánica)',
  NACIMIENTO: 'Fecha de nacimiento',
  NACIONALIDAD: 'Nacionalidad',
  NOMBRE: 'Nombre',
  NUM_DNI: 'Número de DNI',
  NUM_DNI_MIN: 'Número de DNI (pequeño)',
  OPT_VAR: 'Elemento ópticamente variable',
  SEXO: 'Sexo',
  SOPORTE: 'Número de soporte',
  SOPORTE_MIN: 'Número de soporte (ventana)',
  VALIDEZ: 'Fecha de caducidad',
};

export const nombreClase = (clase) => CLASES[clase] || clase;

// Clases que se esperan en cada cara. Es la misma lista que usa el backend para marcar «esperada»
// en /api/dni/stats/campos. Si cambia allí, hay que cambiarla también aquí.
// ES, ESP, ESP_HOLO y OPT_VAR son elementos de seguridad, no campos, y no se esperan en ninguna cara.
export const CLASES_ESPERADAS = {
  anverso: [
    'DOC_DNI', 'APELLIDOS', 'NOMBRE', 'NUM_DNI', 'NUM_DNI_MIN', 'NACIMIENTO', 'SEXO', 'NACIONALIDAD',
    'EMISIÓN', 'VALIDEZ', 'SOPORTE', 'SOPORTE_MIN', 'CAN', 'FIRMA', 'FOTOGRAFIA', 'CLI',
  ],
  reverso: ['DOC_DNI_REV', 'MRZ', 'DOMICILIO', 'LUGAR_NACIMIENTO', 'HIJO_DE', 'EQUIPO', 'SOPORTE_MIN'],
};

export const CARAS = [
  { id: 'anverso', nombre: 'Anverso' },
  { id: 'reverso', nombre: 'Reverso' },
];
