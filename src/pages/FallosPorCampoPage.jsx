import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { dniService, describirError, esCancelacion } from '../services/api';
import { CARAS, nombreClase } from '../constants/clases';
import { formatearConfianza, formatearEntero, formatearFecha, formatearPorcentaje } from '../utils/formato';

// Con menos intentos la probabilidad sale muy imprecisa (con 30 intentos sin fallos el intervalo
// aún llega al 11 %), así que no se colorea ni se destaca, y se marca como «pocos intentos»
const MIN_INTENTOS_FIABLE = 30;

// Detecciones que pide el editor de la web para fiarse de las cajas de cada cara. Las mismas que MIN_DETECCIONES del
// backend (config/clasesDeteccion.js), que solo cuenta los fallos por clase en las caras que llegan a ellas
const MIN_DETECCIONES = { anverso: 15, reverso: 6 };

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

const ORDENES = {
  probabilidad: 'Probabilidad de fallo',
  prudente: 'Límite inferior del intervalo',
};

// Las clases sin intentos van siempre al final
const compararNulos = (a, b) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return null;
};

const comparadores = {
  probabilidad: (a, b) =>
    compararNulos(a.probabilidad, b.probabilidad) ??
    (b.probabilidad - a.probabilidad || b.intentos - a.intentos || a.clase.localeCompare(b.clase)),
  prudente: (a, b) =>
    compararNulos(a.ic95?.[0] ?? null, b.ic95?.[0] ?? null) ??
    (b.ic95[0] - a.ic95[0] || b.probabilidad - a.probabilidad || a.clase.localeCompare(b.clase)),
};

// En las clases no esperadas lo raro es detectarlas, así que se cuentan las veces que sí se detectaron
const comoDeteccion = (fila) => ({
  ...fila,
  probabilidad: Number.isFinite(fila.probabilidad) ? 1 - fila.probabilidad : null,
  ic95: Array.isArray(fila.ic95) ? [1 - fila.ic95[1], 1 - fila.ic95[0]] : null,
  veces: Number.isFinite(fila.intentos) && Number.isFinite(fila.fallos) ? fila.intentos - fila.fallos : null,
});

const colorProbabilidad = (probabilidad, intentos) => {
  if (!Number.isFinite(probabilidad) || intentos < MIN_INTENTOS_FIABLE) return 'text-slate-400';
  if (probabilidad >= 0.2) return 'text-red-400 font-semibold';
  if (probabilidad >= 0.05) return 'text-amber-300 font-semibold';
  return 'text-green-300';
};

// Barra de 0 a 100 % con el intervalo del 95 % y una marca en la probabilidad calculada
const Intervalo = ({ ic95, probabilidad }) => {
  if (!Array.isArray(ic95)) return <span className="text-slate-600">—</span>;
  const [inferior, superior] = ic95;
  const texto = `${formatearPorcentaje(inferior)} a ${formatearPorcentaje(superior)}`;

  return (
    <div className="flex items-center gap-3" title={`Con un 95 % de confianza, la probabilidad real está entre ${texto}`}>
      <span className="relative block h-2 w-28 shrink-0 rounded-full bg-white/10" aria-hidden="true">
        <span
          className="absolute inset-y-0 rounded-full bg-primary-500/50"
          style={{ left: `${inferior * 100}%`, width: `${Math.max((superior - inferior) * 100, 1)}%` }}
        />
        {Number.isFinite(probabilidad) && (
          <span className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-white" style={{ left: `calc(${probabilidad * 100}% - 1px)` }} />
        )}
      </span>
      <span className="text-xs text-slate-300 tabular-nums whitespace-nowrap">{texto}</span>
    </div>
  );
};

const Probabilidad = ({ valor, intentos }) => (
  <span className="flex flex-col items-end">
    <span className={`tabular-nums ${colorProbabilidad(valor, intentos)}`}>{formatearPorcentaje(valor)}</span>
    {Number.isFinite(valor) && intentos < MIN_INTENTOS_FIABLE && (
      <span className="text-[10px] uppercase tracking-wider text-slate-500">pocos intentos</span>
    )}
  </span>
);

const NombreClase = ({ clase }) => (
  <>
    <span className="text-slate-100">{nombreClase(clase)}</span>
    <span className="block font-mono text-[10px] text-slate-500">{clase}</span>
  </>
);

// Sin ninguna cara con plantilla los recuentos de la plantilla son cero por fuerza, y se enseña una raya
const SinPlantilla = () => (
  <span className="text-slate-600" title="Todavía no hay caras con plantilla con estos filtros">—</span>
);

const TablaFallos = ({ titulo, filas, orden, conPlantilla }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <caption className="text-left text-xs text-slate-400 pb-2">
        {titulo}, ordenadas por {ORDENES[orden].toLowerCase()} de mayor a menor
      </caption>
      <thead>
        <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-left font-medium">Campo</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">Prob. de fallo</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-left font-medium">Intervalo del 95 %</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">Fallos</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">Intentos</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">Confianza media</th>
          <th
            scope="col"
            className="px-3 py-2 whitespace-nowrap text-right font-medium"
            title="De las caras con plantilla del DNI, en cuántas la web tapó esta clase en su sitio con ella, porque el modelo no la encontró o su caja estaba fuera de sitio. Debajo, en cuántas el modelo puso la caja de esta clase fuera de su sitio"
          >
            Plantilla
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila.clase} className="border-b border-white/5 last:border-0">
            <th scope="row" className="px-3 py-2 text-left font-normal">
              <NombreClase clase={fila.clase} />
            </th>
            <td className="px-3 py-2 text-right">
              <Probabilidad valor={fila.probabilidad} intentos={fila.intentos} />
            </td>
            <td className="px-3 py-2">
              <Intervalo ic95={fila.ic95} probabilidad={fila.probabilidad} />
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300">{formatearEntero(fila.fallos)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300">{formatearEntero(fila.intentos)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300">{formatearConfianza(fila.confianzaMedia)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300 whitespace-nowrap">
              {conPlantilla > 0 ? (
                <>
                  <span title="Caras tapadas en su sitio con la plantilla">{formatearEntero(fila.rellenada)}</span>
                  {fila.fueraDeSitio > 0 && (
                    <span className="block text-xs text-amber-300" title="Caras con la caja de esta clase fuera de sitio">
                      {formatearEntero(fila.fueraDeSitio)} fuera de sitio
                    </span>
                  )}
                </>
              ) : (
                <SinPlantilla />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TablaNoEsperadas = ({ filas, conPlantilla }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <caption className="text-left text-xs text-slate-400 pb-2">
        Clases no esperadas en esta cara que se detectaron alguna vez, ordenadas por las veces que se detectaron
      </caption>
      <thead>
        <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-left font-medium">Clase</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">% detectada</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-left font-medium">Intervalo del 95 %</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">Detectada</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">Intentos</th>
          <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">Confianza media</th>
          <th
            scope="col"
            className="px-3 py-2 whitespace-nowrap text-right font-medium"
            title="De las caras con plantilla del DNI, en cuántas el modelo puso la caja de esta clase fuera de su sitio. Los elementos de seguridad son los que colocan la plantilla"
          >
            Fuera de sitio
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila.clase} className="border-b border-white/5 last:border-0">
            <th scope="row" className="px-3 py-2 text-left font-normal">
              <NombreClase clase={fila.clase} />
            </th>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300">{formatearPorcentaje(fila.probabilidad)}</td>
            <td className="px-3 py-2">
              <Intervalo ic95={fila.ic95} probabilidad={fila.probabilidad} />
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300">{formatearEntero(fila.veces)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300">{formatearEntero(fila.intentos)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300">{formatearConfianza(fila.confianzaMedia)}</td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-300">
              {conPlantilla > 0 ? formatearEntero(fila.fueraDeSitio) : <SinPlantilla />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Sin valor (null) enseña una raya, para no confundir «sin datos» con un cero
const Contador = ({ titulo, valor, total, ayuda }) => (
  <div className="bg-white/5 rounded-xl p-3" title={ayuda}>
    <dt className="text-xs text-slate-400">{titulo}</dt>
    <dd className="mt-1 text-lg sm:text-xl font-bold text-white tabular-nums">
      {formatearEntero(valor)}
      {Number.isFinite(total) && total > 0 && (
        <span className="text-sm font-normal text-slate-400"> ({formatearPorcentaje(valor / total)})</span>
      )}
    </dd>
  </div>
);

const SeccionCara = ({ idCara, nombre, cara, orden, verNoEsperadas }) => {
  if (!cara) return null;

  const clases = Array.isArray(cara.clases) ? cara.clases : [];
  const esperadas = clases.filter((fila) => fila.esperada).sort(comparadores[orden]);
  // De las no esperadas solo se listan las que se detectaron alguna vez. Las demás se nombran debajo
  const noEsperadas = clases
    .filter((fila) => !fila.esperada && fila.intentos > 0)
    .map(comoDeteccion)
    .sort(comparadores.probabilidad);
  const detectadasAlgunaVez = noEsperadas.filter((fila) => fila.veces > 0);
  const nuncaDetectadas = noEsperadas.filter((fila) => fila.veces === 0);

  return (
    <section aria-labelledby={`cara-${idCara}`} className="glass-card rounded-2xl p-4 md:p-6 space-y-5">
      <h2 id={`cara-${idCara}`} className="text-xl font-bold text-white">{nombre}</h2>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <Contador
          titulo="Caras procesadas"
          valor={cara.intentos}
          ayuda="Registros que traen datos de detección de esta cara, también los que no tienen el documento detectado"
        />
        <Contador
          titulo="Cara no detectada"
          valor={cara.caraNoDetectada}
          total={cara.intentos}
          ayuda="El detector no encontró el documento en esta cara"
        />
        <Contador
          titulo="Censura manual"
          valor={cara.manual}
          total={cara.intentos}
          ayuda={`Caras que no se taparon solas: sin documento detectado, con menos de ${MIN_DETECCIONES[idCara]} detecciones o con algún campo marcado que hubo que tapar a mano`}
        />
        {Number.isFinite(cara.conDatosPlantilla) && (
          <Contador
            titulo="Con plantilla"
            valor={cara.conDatosPlantilla > 0 ? cara.conPlantilla : null}
            total={cara.conDatosPlantilla}
            ayuda={cara.conDatosPlantilla > 0
              ? `De las ${formatearEntero(cara.conDatosPlantilla)} caras que traen este dato (la web lo manda desde el 23/11/2026), en cuántas colocó la plantilla del DNI con las cajas que encontró y la usó para decidir qué tapar. Con ella tapa en su sitio parte de lo que el modelo no encuentra. En las caras que van enteras a mano no se usa`
              : 'Todavía no hay caras con este dato con estos filtros. La web lo manda desde el 23/11/2026'}
          />
        )}
        {idCara === 'reverso' && cara.domicilioPartido && (
          <Contador
            titulo="Domicilio partido"
            valor={cara.domicilioPartido.si + cara.domicilioPartido.no > 0 ? cara.domicilioPartido.si : null}
            total={cara.domicilioPartido.si + cara.domicilioPartido.no}
            ayuda="De las veces que se pidió tapar solo la calle y dejar a la vista municipio y provincia (Viajes), sin que la cara fuera entera a mano, en cuántas se pudieron separar las líneas. Solo se separan con las cuatro líneas del domicilio a la vista. Si no, se tapa el domicilio entero"
          />
        )}
      </dl>

      {cara.intentos > 0 ? (
        <TablaFallos titulo="Clases esperadas" filas={esperadas} orden={orden} conPlantilla={cara.conPlantilla} />
      ) : (
        <p className="text-sm text-slate-400">Todavía no hay datos de esta cara con estos filtros.</p>
      )}

      {verNoEsperadas && cara.intentos > 0 && (
        <div className="pt-4 border-t border-white/5 space-y-2">
          <p className="text-xs text-slate-400">
            En estas clases lo normal es no detectarlas. Holograma, ES, ESP y el elemento ópticamente variable son
            elementos de seguridad y no campos. Una clase de la otra cara detectada aquí puede indicar caras cambiadas o
            una detección falsa.
          </p>
          {detectadasAlgunaVez.length > 0 && <TablaNoEsperadas filas={detectadasAlgunaVez} conPlantilla={cara.conPlantilla} />}
          {nuncaDetectadas.length > 0 && (
            <p className="text-xs text-slate-400">
              No se detectaron nunca: {nuncaDetectadas.map((fila) => nombreClase(fila.clase)).join(', ')}.
            </p>
          )}
          {noEsperadas.length === 0 && (
            <p className="text-sm text-slate-500">El backend no ha enviado clases no esperadas.</p>
          )}
        </div>
      )}
    </section>
  );
};

const nombreModelo = (modelo) => {
  if (!modelo || modelo === 'desconocido') return 'Versión desconocida';
  return modelo.length > 16 ? `${modelo.slice(0, 16)}…` : modelo;
};

const FallosPorCampoPage = () => {
  const [params, setParams] = useSearchParams();
  const modelo = params.get('modelo') ?? '';
  const desde = FECHA_VALIDA.test(params.get('desde') ?? '') ? params.get('desde') : '';
  const hasta = FECHA_VALIDA.test(params.get('hasta') ?? '') ? params.get('hasta') : '';
  const verNoEsperadas = params.get('noEsperadas') === '1';
  const orden = params.get('orden') === 'prudente' ? 'prudente' : 'probabilidad';

  const [recargas, setRecargas] = useState(0);
  const [resultado, setResultado] = useState(null);

  const rangoValido = !(desde && hasta && desde > hasta);
  const clave = `${modelo}|${desde}|${hasta}|${recargas}`;

  useEffect(() => {
    if (!rangoValido) return undefined;

    // Espera un poco antes de pedir, para no lanzar una petición por cada cifra que se escribe en las fechas
    const controller = new AbortController();
    const espera = setTimeout(() => {
      dniService
        .fieldStats({ modelo, desde, hasta }, controller.signal)
        .then((datos) => setResultado({ clave, datos, error: null }))
        .catch((error) => {
          if (!esCancelacion(error)) setResultado({ clave, datos: null, error: describirError(error) });
        });
    }, 300);

    return () => {
      clearTimeout(espera);
      controller.abort();
    };
  }, [clave, modelo, desde, hasta, rangoValido]);

  // Parte de la dirección actual y no de params, que puede no estar al día si se cambian dos filtros seguidos
  const cambiarFiltros = (cambios) => {
    const siguientes = new URLSearchParams(window.location.search);
    Object.entries(cambios).forEach(([nombre, valor]) => (valor ? siguientes.set(nombre, valor) : siguientes.delete(nombre)));
    setParams(siguientes, { replace: true });
  };

  const cargando = rangoValido && resultado?.clave !== clave;
  const datos = resultado?.datos;
  const hayFiltros = Boolean(modelo || desde || hasta);

  // Las versiones que devuelve el backend, más la elegida aunque no tenga registros en estas fechas
  const modelos = Array.isArray(datos?.modelos) ? datos.modelos : [];
  const opcionesModelo = modelo && !modelos.some((m) => m.modelo === modelo) ? [...modelos, { modelo }] : modelos;

  // modelos trae todas las versiones de estas fechas aunque se filtre por una, y conDeteccion se limita al modelo
  // elegido. Por eso los registros sin detección se calculan con la suma de modelos y no con conDeteccion
  const conDeteccionTotal = modelos.reduce((suma, m) => suma + (Number(m.registros) || 0), 0);
  const sinDeteccion = datos ? Math.max((datos.registros ?? 0) - conDeteccionTotal, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Fallos por campo</h1>
          <p className="text-slate-400 max-w-3xl">
            Con qué probabilidad el detector de la web no encuentra cada campo del DNI, por cara. Sirve para ver qué campos
            fallan más y si una versión nueva del modelo mejora.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRecargas((n) => n + 1)}
          className="self-start md:self-auto p-3 rounded-xl bg-dark-800 border border-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Recargar los datos"
          title="Recargar los datos"
        >
          <RefreshCw size={20} className={cargando ? 'animate-spin' : ''} />
        </button>
      </div>

      <form className="glass-card rounded-2xl p-4 space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Filtros">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
          <label className="flex flex-col gap-1 text-xs text-slate-400 uppercase tracking-wider">
            Versión del modelo
            <select
              value={modelo}
              onChange={(e) => cambiarFiltros({ modelo: e.target.value })}
              className="w-full min-w-0 bg-dark-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case tracking-normal"
            >
              <option value="">Todas las versiones</option>
              {opcionesModelo.map((m) => (
                <option key={m.modelo} value={m.modelo}>
                  {nombreModelo(m.modelo)}
                  {Number.isFinite(m.registros) ? ` · ${formatearEntero(m.registros)} registros` : ''}
                  {m.ultimo ? ` · hasta el ${formatearFecha(m.ultimo, { conHora: false })}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400 uppercase tracking-wider">
            Desde
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => cambiarFiltros({ desde: e.target.value })}
              className="w-full min-w-0 bg-dark-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400 uppercase tracking-wider">
            Hasta, incluido
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => cambiarFiltros({ hasta: e.target.value })}
              className="w-full min-w-0 bg-dark-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]"
            />
          </label>
          <button
            type="button"
            onClick={() => cambiarFiltros({ modelo: '', desde: '', hasta: '' })}
            disabled={!hayFiltros}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={16} /> Quitar filtros
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={verNoEsperadas}
              onChange={(e) => cambiarFiltros({ noEsperadas: e.target.checked ? '1' : '' })}
              className="h-4 w-4 rounded border-white/20 bg-dark-900 accent-indigo-500"
            />
            Ver también las clases no esperadas
          </label>
          <label className="flex items-center gap-2 sm:ml-auto">
            Ordenar por
            <select
              value={orden}
              onChange={(e) => cambiarFiltros({ orden: e.target.value === 'prudente' ? 'prudente' : '' })}
              className="bg-dark-900/60 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white"
            >
              {Object.entries(ORDENES).map(([valor, texto]) => (
                <option key={valor} value={valor}>{texto}</option>
              ))}
            </select>
          </label>
        </div>
      </form>

      {!rangoValido && (
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} className="shrink-0" />
          La fecha «Desde» es posterior a «Hasta». Cambia una de las dos.
        </div>
      )}

      {rangoValido && !resultado && (
        <div className="flex h-[30vh] items-center justify-center">
          <Loader2 className="animate-spin text-primary-500" size={40} aria-label="Cargando los datos" />
        </div>
      )}

      {rangoValido && resultado?.error && (
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} className="shrink-0" />
          No se pudieron cargar los fallos por campo. {resultado.error}
        </div>
      )}

      {rangoValido && datos && (
        <div className={`space-y-6 transition-opacity ${cargando ? 'opacity-60' : ''}`} aria-busy={cargando}>
          {datos.registros === 0 ? (
            <p className="text-slate-400">No hay registros en estas fechas.</p>
          ) : (
            sinDeteccion > 0 && (
              <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  De {formatearEntero(datos.registros)} registros en estas fechas, {formatearEntero(conDeteccionTotal)} traen
                  datos de detección. Los otros {formatearEntero(sinDeteccion)} son de antes de que la web empezara a
                  enviarlos y no cuentan aquí.
                </span>
              </p>
            )
          )}

          {modelo && datos.registros > 0 && (
            <p className="text-sm text-slate-300 bg-white/5 border border-white/10 rounded-xl p-4 flex gap-2">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>
                Con la versión elegida cuentan {formatearEntero(datos.conDeteccion ?? 0)} de los{' '}
                {formatearEntero(conDeteccionTotal)} registros con datos de detección de estas fechas.
                {(datos.conDeteccion ?? 0) < conDeteccionTotal && ' Los demás son de otras versiones del modelo.'}
              </span>
            </p>
          )}

          {modelos.length > 0 && (
            <div className="glass-card rounded-2xl p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="text-left text-xs text-slate-400 pb-2">Versiones del modelo en estas fechas</caption>
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
                    <th scope="col" className="px-3 py-2 whitespace-nowrap text-left font-medium">Versión</th>
                    <th scope="col" className="px-3 py-2 whitespace-nowrap text-right font-medium">Registros</th>
                    <th scope="col" className="px-3 py-2 whitespace-nowrap text-left font-medium">Primero</th>
                    <th scope="col" className="px-3 py-2 whitespace-nowrap text-left font-medium">Último</th>
                    <th scope="col" className="px-3 py-2"><span className="sr-only">Filtrar</span></th>
                  </tr>
                </thead>
                <tbody>
                  {modelos.map((m) => (
                    <tr key={m.modelo} className={`border-b border-white/5 last:border-0 ${m.modelo === modelo ? 'bg-primary-500/10' : ''}`}>
                      <th scope="row" className="px-3 py-2 text-left font-mono font-normal text-slate-200" title={m.modelo}>
                        <span className="md:hidden whitespace-nowrap">{nombreModelo(m.modelo)}</span>
                        <span className="hidden md:inline break-all">{m.modelo === 'desconocido' ? 'Versión desconocida' : m.modelo}</span>
                      </th>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-300">{formatearEntero(m.registros)}</td>
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{formatearFecha(m.primero)}</td>
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{formatearFecha(m.ultimo)}</td>
                      <td className="px-3 py-2 text-right">
                        {m.modelo === modelo ? (
                          <span className="text-xs text-primary-300">Filtrada</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => cambiarFiltros({ modelo: m.modelo })}
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-200 whitespace-nowrap"
                          >
                            Ver solo esta
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {datos.caras ? (
            CARAS.map(({ id, nombre }) => (
              <SeccionCara
                key={id}
                idCara={id}
                nombre={nombre}
                cara={datos.caras[id]}
                orden={orden}
                verNoEsperadas={verNoEsperadas}
              />
            ))
          ) : (
            <p className="text-slate-400">El backend no ha devuelto datos por cara.</p>
          )}

          <div className="text-xs text-slate-400 space-y-2 flex gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>
                Cada intento es una cara reconocida, con el documento detectado y al menos {MIN_DETECCIONES.anverso}{' '}
                detecciones en el anverso o {MIN_DETECCIONES.reverso} en el reverso. Hay fallo si el detector no encontró
                el campo. Mide solo al modelo y vale igual para los registros de antes y de después de la plantilla del DNI
                (23/11/2026). Hoy, si falta un campo marcado, la web intenta taparlo en su sitio con la plantilla, y la
                columna Plantilla dice cuántas veces lo hizo. Si no puede, lo pide en la censura manual, salvo las copias
                de otros datos y el CLI, que el modelo casi nunca encuentra. Esos se quedan a la vista si la cara se tapa
                sola. Las caras sin documento
                detectado o con menos detecciones no cuentan aquí, porque se tapan enteras a mano. Se cuentan arriba, en
                cara no detectada y censura manual. La confianza media es la del detector cuando sí encontró el campo,
                entre 0 y 1.
              </p>
              <p>
                El intervalo del 95 % (de Wilson) es el margen en el que está la probabilidad real. Con pocos intentos es
                muy ancho y la probabilidad calculada no se destaca. Por debajo de {MIN_INTENTOS_FIABLE} intentos sale en
                gris. Ordenar por el límite inferior del intervalo pone arriba los campos que seguro fallan más.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FallosPorCampoPage;
