import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowLeft, CheckCircle, Clock, Cpu, Droplets, Eye, EyeOff, FileText, Fingerprint,
  Loader2, PenTool, Scissors, Shield, Tag, Trash2, XCircle,
} from 'lucide-react';
import { dniService, describirError, esCancelacion } from '../services/api';
import { CAMPOS_TAPABLES, fiabilidadMetrica, perfilDe, perfilInvertido } from '../constants/campos';
import { CARAS, CLASES_ESPERADAS, nombreClase } from '../constants/clases';
import { formatearConfianza, formatearFecha, formatearPorcentaje, taparNumeros } from '../utils/formato';

const SinDato = ({ titulo }) => (
  <span className="text-slate-500" title={titulo}>Sin dato</span>
);

// El «sí» sale en ámbar cuando avisa de algo, como los pasos manuales, y en verde cuando es bueno
const SiNo = ({ valor, si = 'Sí', no = 'No', siEsBueno = false, tituloSinDato }) => {
  if (typeof valor !== 'boolean') return <SinDato titulo={tituloSinDato} />;
  return valor ? (
    <span className={`${siEsBueno ? 'text-green-300' : 'text-amber-300'} flex items-center gap-1`}>
      <CheckCircle size={14} /> {si}
    </span>
  ) : (
    <span className="text-slate-300 flex items-center gap-1">
      <XCircle size={14} /> {no}
    </span>
  );
};

const Dato = ({ icono, titulo, children }) => (
  <div className="bg-white/5 p-3 rounded-lg min-w-0">
    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-2">
      {icono}
      {titulo}
    </div>
    <div className="text-sm">{children}</div>
  </div>
);

const TituloSeccion = ({ icono, children }) => (
  <h2 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 border-b border-primary-500/20 pb-2 flex items-center gap-2">
    {icono}
    {children}
  </h2>
);

const Nota = ({ children }) => (
  <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex gap-2">
    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
    <span>{children}</span>
  </p>
);

const EstadoCampo = ({ valor }) => {
  if (typeof valor !== 'boolean') return <span className="text-xs text-slate-500">Sin dato</span>;
  return valor ? (
    <span className="flex items-center gap-1.5 text-primary-300 text-xs">
      <EyeOff size={14} /> Marcado
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-amber-300 text-xs">
      <Eye size={14} /> Sin marcar
    </span>
  );
};

// Las 21 casillas del editor, marcadas o no. Cómo se leen depende de la fecha del registro, ver fiabilidadMetrica.
// Hasta el 24/11/2026 se llamaba «Campos tapados», pero desde CEN-6 y CEN-7 la web tapa también la MRZ, el CLI y la
// ventana del soporte cuando repiten un dato marcado, aunque su casilla no lo esté, y con Viajes salían «Visible»
const CamposMarcados = ({ registro }) => {
  const fiabilidad = fiabilidadMetrica(registro, 'hiddenFields');
  const sinDatos = fiabilidad === 'sin-datos';

  return (
    <section className="mb-8">
      <TituloSeccion icono={<EyeOff size={16} />}>Campos marcados</TituloSeccion>
      <p className="text-xs text-slate-400 mb-4">
        Las casillas que se marcaron para tapar. Desde el 24/11/2026 la web tapa además la MRZ, el CLI y la ventana del
        soporte cuando repiten un dato marcado, aunque su casilla no esté marcada.
      </p>

      {sinDatos && (
        <Nota>
          Registro anterior al 26/01/2026. Hasta entonces el backend no guardaba qué campos se marcaban, así que lo que
          devuelve son los valores por defecto y no se enseñan.
        </Nota>
      )}
      {fiabilidad === 'dudosa' && (
        <Nota>
          Registro del 26/01/2026, el día en que se empezó a guardar este dato. Puede traer los valores por defecto
          (todo marcado) en vez de lo que se eligió.
        </Nota>
      )}

      {CAMPOS_TAPABLES.map(({ grupo, titulo, campos }) => (
        <div key={grupo} className="mb-4 last:mb-0">
          <h3 className="text-xs text-slate-400 uppercase mb-2 font-semibold">{titulo}</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {campos.map(([clave, nombre]) => (
              <li key={clave} className="bg-white/5 px-3 py-2 rounded-lg flex items-center justify-between gap-2">
                <span className="text-white text-xs">{nombre}</span>
                <EstadoCampo valor={sinDatos ? null : registro.hiddenFields?.[grupo]?.[clave]} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};

const BarraConfianza = ({ valor }) => (
  <span className="flex items-center gap-2 min-w-[6.5rem] justify-end">
    <span className="h-1.5 w-12 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
      <span className="block h-full bg-primary-500" style={{ width: `${Math.round(valor * 100)}%` }} />
    </span>
    <span className="tabular-nums text-slate-200 text-xs w-9 text-right">{formatearConfianza(valor)}</span>
  </span>
);

const DeteccionCara = ({ cara, idCara, nombre }) => {
  if (cara === null || cara === undefined) {
    return (
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-1">{nombre}</h3>
        <p className="text-sm text-slate-400">No se subió esta cara.</p>
      </div>
    );
  }

  const clases = cara.clases || {};
  const esperadas = CLASES_ESPERADAS[idCara];
  const vistas = esperadas.filter((clase) => Number.isFinite(clases[clase])).length;
  const otras = Object.entries(clases)
    .filter(([clase, confianza]) => !esperadas.includes(clase) && Number.isFinite(confianza))
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white">{nombre}</h3>
        <span className="text-xs text-slate-400 tabular-nums">
          {vistas} de {esperadas.length} clases esperadas
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-xs mb-4">
        <div className="bg-dark-900/60 rounded-lg p-2">
          <dt className="text-slate-500">Documento</dt>
          <dd className={cara.caraDetectada ? 'text-green-300' : 'text-red-300'}>
            {cara.caraDetectada ? 'Detectado' : 'No detectado'}
          </dd>
        </div>
        <div className="bg-dark-900/60 rounded-lg p-2">
          <dt className="text-slate-500">Censura</dt>
          <dd className={cara.automatica ? 'text-green-300' : 'text-amber-300'}>
            {cara.automatica ? 'Automática' : 'Manual'}
          </dd>
        </div>
        <div className="bg-dark-900/60 rounded-lg p-2">
          <dt className="text-slate-500">Detecciones</dt>
          <dd className="text-white tabular-nums">{Number.isFinite(cara.detecciones) ? cara.detecciones : '—'}</dd>
        </div>
      </dl>

      {!cara.caraDetectada && (
        <p className="text-xs text-slate-400 mb-3">El detector no encontró el documento en esta cara, así que se censuró a mano.</p>
      )}

      <PlantillaCara cara={cara} idCara={idCara} />

      <ul className="divide-y divide-white/5">
        {esperadas.map((clase) => (
          <li key={clase} className="flex items-center justify-between gap-3 py-1.5 text-xs">
            <span className={Number.isFinite(clases[clase]) ? 'text-slate-200' : 'text-red-300'} title={clase}>
              {nombreClase(clase)}
            </span>
            {Number.isFinite(clases[clase]) ? (
              <BarraConfianza valor={clases[clase]} />
            ) : (
              <span className="text-red-300">No detectada</span>
            )}
          </li>
        ))}
      </ul>

      {otras.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-slate-500 mb-2">Otras clases detectadas (elementos de seguridad o clases de la otra cara)</p>
          <ul className="flex flex-wrap gap-1.5">
            {otras.map(([clase, confianza]) => (
              <li key={clase} className="text-xs px-2 py-1 rounded bg-dark-900/60 text-slate-300" title={clase}>
                {nombreClase(clase)} <span className="tabular-nums text-slate-400">{formatearConfianza(confianza)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Nombres de las clases de una lista, o «Sin dato» si el registro no la trae bien
const listaDeClases = (lista) => {
  if (!Array.isArray(lista)) return 'Sin dato';
  return lista.length > 0 ? lista.map(nombreClase).join(', ') : 'Ninguna';
};

// Plantilla del DNI (MET-4). Los registros de antes del 23/11/2026 no la traen. Lo que se dice de cada dato depende de
// si la cara se tapó sola o pasó por la censura manual
const PlantillaCara = ({ cara, idCara }) => {
  if (typeof cara.plantilla !== 'boolean') return null;
  const aMano = cara.automatica !== true;
  let plantilla = aMano ? 'No se usó. Se tapó a mano la cara entera o lo que faltaba' : 'No se usó. Se tapó con las cajas del modelo';
  if (cara.plantilla) {
    plantilla = `Colocada${Number.isFinite(cara.errorPlantilla) ? `, error del ${formatearPorcentaje(cara.errorPlantilla)} del alto` : ''}`;
  }
  let domicilio = 'Calle separada del municipio y la provincia';
  if (cara.domicilioPartido === false) domicilio = aMano ? 'No se pudo separar la calle' : 'No se pudo separar la calle, se tapó el domicilio entero';
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4">
      <div className="bg-dark-900/60 rounded-lg p-2">
        <dt className="text-slate-500">Plantilla del DNI</dt>
        <dd className={cara.plantilla ? 'text-green-300' : 'text-slate-300'}>{plantilla}</dd>
      </div>
      {idCara === 'reverso' && typeof cara.domicilioPartido === 'boolean' && (
        <div className="bg-dark-900/60 rounded-lg p-2">
          <dt className="text-slate-500">Domicilio</dt>
          <dd className={cara.domicilioPartido ? 'text-green-300' : 'text-amber-300'}>{domicilio}</dd>
        </div>
      )}
      <div className="bg-dark-900/60 rounded-lg p-2">
        <dt className="text-slate-500">Cajas fuera de sitio</dt>
        <dd className={cara.plantilla && cara.fueraDeSitio?.length ? 'text-amber-300' : 'text-slate-300'}>
          {cara.plantilla ? listaDeClases(cara.fueraDeSitio) : 'No se comprueba sin plantilla'}
        </dd>
      </div>
      <div className="bg-dark-900/60 rounded-lg p-2">
        <dt className="text-slate-500">Tapado con la plantilla</dt>
        <dd className="text-slate-300">{cara.plantilla ? listaDeClases(cara.rellenadas) : 'Nada'}</dd>
      </div>
    </dl>
  );
};

const DeteccionRegistro = ({ deteccion }) => (
  <section className="mb-8">
    <TituloSeccion icono={<Cpu size={16} />}>Detección por campo</TituloSeccion>
    {deteccion ? (
      <>
        <p className="text-xs text-slate-400 mb-4">
          Confianza máxima de cada clase en cada cara, entre 0 y 1. Versión del modelo{' '}
          <span className="font-mono text-slate-200 break-all">{deteccion.modelo || 'desconocido'}</span>
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CARAS.map(({ id, nombre }) => (
            <DeteccionCara key={id} idCara={id} nombre={nombre} cara={deteccion[id]} />
          ))}
        </div>
      </>
    ) : (
      <p className="text-sm text-slate-400">
        Este registro no trae datos de detección. La web empezó a enviarlos en la versión que guarda la probabilidad de fallo por campo.
      </p>
    )}
  </section>
);

const Homogeneidad = ({ registro }) => {
  if (fiabilidadMetrica(registro, 'homogenityPassed') === 'sin-datos') {
    return <SinDato titulo="Antes del 29/01/2026 se guardaba como sí o no" />;
  }
  if (!Number.isFinite(registro.homogenityPassed)) {
    return <SinDato titulo="Métrica de la lectura OCR. La web ya no la envía" />;
  }
  return <span className="text-white font-medium tabular-nums">{formatearPorcentaje(registro.homogenityPassed / 100)}</span>;
};

const DniDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [resultado, setResultado] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    dniService
      .getById(id, controller.signal)
      .then((registro) => setResultado({ id, registro, error: null }))
      .catch((error) => {
        if (esCancelacion(error)) return;
        setResultado({
          id,
          registro: null,
          error: describirError(error, {
            400: 'El identificador del registro no es válido.',
            404: 'No existe ningún registro con ese identificador. Puede que se haya eliminado.',
          }),
        });
      });
    return () => controller.abort();
  }, [id]);

  // Vuelve a la página del listado de la que se vino. Si se abrió el detalle directamente, al principio del listado
  const volver = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este registro? No se puede deshacer.')) return;

    setBorrando(true);
    setErrorBorrado(null);
    try {
      await dniService.delete(id);
      volver();
    } catch (error) {
      setErrorBorrado(describirError(error, { 404: 'Ese registro ya no existe.' }));
      setBorrando(false);
    }
  };

  const botonVolver = (
    <button onClick={volver} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
      <ArrowLeft size={20} /> Volver al listado
    </button>
  );

  if (!resultado || resultado.id !== id) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={40} aria-label="Cargando el registro" />
      </div>
    );
  }

  if (resultado.error || !resultado.registro) {
    return (
      <div className="space-y-6">
        {botonVolver}
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} className="shrink-0" />
          {resultado.error || 'El backend no devolvió el registro.'}
        </div>
      </div>
    );
  }

  const dni = resultado.registro;
  const perfil = perfilDe(dni.profileUsed);
  const recorteSinDato = fiabilidadMetrica(dni, 'manualDetection') === 'sin-datos';

  return (
    <div className="space-y-6">
      {botonVolver}

      <div className="glass-card p-5 md:p-8 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
          <div className="overflow-hidden">
            <p className="text-sm text-slate-400">Registro de uso anónimo</p>
            <h1 className="text-xl md:text-2xl font-mono font-bold text-white mt-1 break-all">{dni._id}</h1>
            <p className="text-sm text-slate-400 mt-2 flex items-center gap-2">
              <Clock size={14} /> {formatearFecha(dni.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {perfil ? (
              <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-sm font-medium ${perfil.color}`}>
                <Tag size={14} />
                Perfil {perfil.nombre}
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-slate-400">Sin perfil guardado</div>
            )}
          </div>
        </div>

        {perfilInvertido(dni) === 'invertido' && (
          <Nota>
            Hasta el 13/11/2026 los perfiles predefinidos tapaban lo contrario de lo que prometían. Los campos marcados de
            abajo son lo que se tapó de verdad, no lo que dice el perfil.
          </Nota>
        )}
        {perfilInvertido(dni) === 'dudoso' && (
          <Nota>
            Este registro es del 13/11/2026, el día en que se corrigieron los perfiles predefinidos, que hasta entonces
            tapaban lo contrario de lo que prometían. Puede ser de antes o de después de la corrección. Los campos marcados
            de abajo son lo que se tapó de verdad.
          </Nota>
        )}

        <section className="mb-8">
          <TituloSeccion icono={<Shield size={16} />}>Datos del procesado</TituloSeccion>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <Dato icono={<Fingerprint size={12} />} titulo="Holograma">
              <span title="Alguna de las clases ES, ESP, ESP_HOLO u OPT_VAR en el anverso">
                <SiNo valor={dni.hologramReadable} si="Detectado" no="No detectado" siEsBueno />
              </span>
            </Dato>
            <Dato icono={<Droplets size={12} />} titulo="Homogeneidad">
              <Homogeneidad registro={dni} />
            </Dato>
            <Dato icono={<Scissors size={12} />} titulo="Recorte manual">
              {recorteSinDato ? (
                <SinDato titulo="Antes del 29/01/2026 no se guardaba" />
              ) : (
                <SiNo valor={dni.manualDetection} />
              )}
            </Dato>
            <Dato icono={<PenTool size={12} />} titulo="Censura manual">
              <SiNo valor={dni.manualCensor} />
            </Dato>
            <Dato icono={<FileText size={12} />} titulo="Marca de agua">
              {dni.watermarkText ? (
                <span className="text-white break-words">{taparNumeros(dni.watermarkText)}</span>
              ) : (
                <SinDato />
              )}
            </Dato>
          </div>
        </section>

        <CamposMarcados registro={dni} />

        <DeteccionRegistro deteccion={dni.deteccion} />

        <div className="pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <Clock size={12} /> Creado el {formatearFecha(dni.createdAt)}
          </span>
          {dni.updatedAt && dni.updatedAt !== dni.createdAt && (
            <span className="flex items-center gap-2">
              <Clock size={12} /> Actualizado el {formatearFecha(dni.updatedAt)}
            </span>
          )}
        </div>

        {errorBorrado && (
          <div role="alert" className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
            <AlertCircle size={20} className="shrink-0" />
            No se pudo eliminar el registro. {errorBorrado}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={borrando}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all font-medium disabled:opacity-60"
          >
            {borrando ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            Eliminar registro definitivamente
          </button>
        </div>
      </div>
    </div>
  );
};

export default DniDetailPage;
