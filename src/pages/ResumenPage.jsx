import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Info, Loader2, RefreshCw, X } from 'lucide-react';
import { dniService, describirError, esCancelacion } from '../services/api';
import { CAMPOS_TAPABLES, PERFILES } from '../constants/campos';
import { formatearEntero, formatearFecha, formatearPorcentaje } from '../utils/formato';

// Resumen del uso de la web (BACK-4). Lo que mide el modelo de campos está en «Fallos por campo»

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const UN_DIA = 24 * 60 * 60 * 1000;
// Con más días que estos la actividad se agrupa por semanas, para que las barras no queden de un píxel
const MAX_DIAS_POR_DIA = 62;

const NOMBRES_CASILLA = Object.fromEntries(
  CAMPOS_TAPABLES.flatMap(({ grupo, campos }) =>
    campos.map(([clave, nombre]) => [`${grupo === 'frontFields' ? 'anverso' : 'reverso'}:${clave}`, nombre])
  )
);

// Los días llegan como AAAA-MM-DD de España. Se cuentan en UTC para que el cambio de hora no mueva ninguno
const aMilisegundos = (dia) => Date.parse(`${dia}T00:00:00Z`);
const aDia = (ms) => new Date(ms).toISOString().slice(0, 10);
const lunesDe = (ms) => ms - ((new Date(ms).getUTCDay() + 6) % 7) * UN_DIA;
const fechaCorta = (dia) => {
  const [anio, mes, numero] = dia.split('-');
  return `${numero}/${mes}/${anio}`;
};

/**
 * Barras de la actividad, con los días sin registros a cero, entre desde y hasta si se han elegido o entre el primer
 * y el último día con registros. Por semanas (de lunes a domingo) si son muchos días
 */
const barrasDeActividad = (porDia, desde, hasta) => {
  const cuenta = new Map(porDia.map(({ dia, registros }) => [dia, registros]));
  const dias = porDia.map(({ dia }) => dia);
  const inicio = desde || dias[0];
  const fin = hasta || dias[dias.length - 1];
  if (!inicio || !fin || inicio > fin) return { barras: [], porSemanas: false };

  const primero = aMilisegundos(inicio);
  const ultimo = aMilisegundos(fin);
  const porSemanas = (ultimo - primero) / UN_DIA + 1 > MAX_DIAS_POR_DIA;
  const barras = [];
  for (let ms = porSemanas ? lunesDe(primero) : primero; ms <= ultimo; ms += (porSemanas ? 7 : 1) * UN_DIA) {
    let registros = 0;
    for (let d = 0; d < (porSemanas ? 7 : 1); d += 1) registros += cuenta.get(aDia(ms + d * UN_DIA)) ?? 0;
    barras.push({ dia: aDia(ms), registros });
  }
  return { barras, porSemanas };
};

const Contador = ({ titulo, valor, total, ayuda, detalle }) => (
  <div className="bg-white/5 rounded-xl p-3" title={ayuda}>
    <dt className="text-xs text-slate-400">{titulo}</dt>
    <dd className="mt-1 text-lg sm:text-xl font-bold text-white tabular-nums">
      {formatearEntero(valor)}
      {Number.isFinite(total) && total > 0 && (
        <span className="text-sm font-normal text-slate-400"> ({formatearPorcentaje(valor / total)})</span>
      )}
      {detalle && <span className="block text-xs font-normal text-slate-500">{detalle}</span>}
    </dd>
  </div>
);

const Actividad = ({ porDia, desde, hasta }) => {
  const { barras, porSemanas } = barrasDeActividad(porDia, desde, hasta);
  if (barras.length === 0) return null;
  const maximo = Math.max(...barras.map((b) => b.registros), 1);
  const pico = barras.reduce((a, b) => (b.registros > a.registros ? b : a), barras[0]);
  const unidad = porSemanas ? 'semana' : 'día';
  const etiqueta = (b) => (porSemanas ? `Semana del ${fechaCorta(b.dia)}` : fechaCorta(b.dia));

  return (
    <section aria-labelledby="actividad" className="glass-card rounded-2xl p-4 md:p-6 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="actividad" className="text-xl font-bold text-white">Procesados por {unidad}</h2>
        <p className="text-xs text-slate-400">
          Máximo, {formatearEntero(pico.registros)} {porSemanas ? 'la semana del' : 'el'} {fechaCorta(pico.dia)}
        </p>
      </div>
      <div
        role="img"
        aria-label={`Procesados por ${unidad} del ${fechaCorta(barras[0].dia)} al ${fechaCorta(barras[barras.length - 1].dia)}. Máximo de ${pico.registros} ${porSemanas ? 'la semana del' : 'el'} ${fechaCorta(pico.dia)}`}
        className="flex h-40 items-end gap-px"
      >
        {barras.map((b) => (
          <div
            key={b.dia}
            title={`${etiqueta(b)}: ${formatearEntero(b.registros)} procesados`}
            className="flex-1 min-w-0 rounded-t bg-primary-500/70 hover:bg-primary-400"
            style={{ height: `${(b.registros / maximo) * 100}%`, minHeight: b.registros > 0 ? 2 : 0 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-500 tabular-nums">
        <span>{fechaCorta(barras[0].dia)}</span>
        <span>{fechaCorta(barras[barras.length - 1].dia)}</span>
      </div>
    </section>
  );
};

const Barra = ({ fraccion }) => (
  <span className="relative block h-2 w-full min-w-16 rounded-full bg-white/10" aria-hidden="true">
    <span
      className="absolute inset-y-0 left-0 rounded-full bg-primary-500/70"
      style={{ width: `${Math.min(Math.max(fraccion, 0), 1) * 100}%` }}
    />
  </span>
);

const Perfiles = ({ perfiles, registros }) => (
  <section aria-labelledby="perfiles" className="glass-card rounded-2xl p-4 md:p-6 space-y-3">
    <h2 id="perfiles" className="text-xl font-bold text-white">Perfiles</h2>
    <ul className="space-y-2">
      {perfiles.map(({ perfil, registros: veces }) => (
        <li key={perfil ?? 'ninguno'} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="text-slate-200 truncate">{perfil ? PERFILES[perfil]?.nombre ?? perfil : 'Sin perfil'}</span>
          <Barra fraccion={registros > 0 ? veces / registros : 0} />
          <span className="tabular-nums text-slate-300 text-right whitespace-nowrap">
            {formatearEntero(veces)} <span className="text-slate-500">({formatearPorcentaje(registros > 0 ? veces / registros : null)})</span>
          </span>
        </li>
      ))}
    </ul>
  </section>
);

const TablaCasillas = ({ titulo, cara, casillas }) => {
  const filas = casillas
    .map((c) => ({ ...c, fraccion: c.conDato > 0 ? c.marcada / c.conDato : null }))
    .sort((a, b) => (b.fraccion ?? -1) - (a.fraccion ?? -1) || b.conDato - a.conDato);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="text-left text-xs text-slate-400 pb-2">{titulo}, de la más marcada a la menos</caption>
        <thead>
          <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
            <th scope="col" className="px-3 py-2 text-left font-medium">Casilla</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Marcada</th>
            {/* En el móvil no cabe la barra y se quedaría cortada la última columna */}
            <th scope="col" className="hidden sm:table-cell px-3 py-2 font-medium"><span className="sr-only">Proporción</span></th>
            <th scope="col" className="px-3 py-2 text-right font-medium whitespace-nowrap" title="Veces marcada de las veces que llegó la casilla">
              Veces
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((c) => (
            <tr key={c.casilla} className="border-b border-white/5 last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-normal text-slate-100">
                {NOMBRES_CASILLA[`${cara}:${c.casilla}`] ?? c.casilla}
              </th>
              <td className="px-3 py-2 text-right tabular-nums text-slate-200">{formatearPorcentaje(c.fraccion)}</td>
              <td className="hidden sm:table-cell px-3 py-2 w-1/3"><Barra fraccion={c.fraccion ?? 0} /></td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-400 whitespace-nowrap">
                {formatearEntero(c.marcada)} de {formatearEntero(c.conDato)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ResumenPage = () => {
  const [params, setParams] = useSearchParams();
  const desde = FECHA_VALIDA.test(params.get('desde') ?? '') ? params.get('desde') : '';
  const hasta = FECHA_VALIDA.test(params.get('hasta') ?? '') ? params.get('hasta') : '';

  const [recargas, setRecargas] = useState(0);
  const [resultado, setResultado] = useState(null);

  const rangoValido = !(desde && hasta && desde > hasta);
  const clave = `${desde}|${hasta}|${recargas}`;

  useEffect(() => {
    if (!rangoValido) return undefined;

    // Espera un poco antes de pedir, para no lanzar una petición por cada cifra que se escribe en las fechas
    const controller = new AbortController();
    const espera = setTimeout(() => {
      dniService
        .summary({ desde, hasta }, controller.signal)
        .then((datos) => setResultado({ clave, datos, error: null }))
        .catch((error) => {
          if (!esCancelacion(error)) setResultado({ clave, datos: null, error: describirError(error) });
        });
    }, 300);

    return () => {
      clearTimeout(espera);
      controller.abort();
    };
  }, [clave, desde, hasta, rangoValido]);

  // Parte de la dirección actual y no de params, que puede no estar al día si se cambian dos filtros seguidos
  const cambiarFiltros = (cambios) => {
    const siguientes = new URLSearchParams(window.location.search);
    Object.entries(cambios).forEach(([nombre, valor]) => (valor ? siguientes.set(nombre, valor) : siguientes.delete(nombre)));
    setParams(siguientes, { replace: true });
  };

  const cargando = rangoValido && resultado?.clave !== clave;
  const datos = resultado?.datos;
  const hayFiltros = Boolean(desde || hasta);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Resumen</h1>
          <p className="text-slate-400 max-w-3xl">
            Cuánto se usa la web y cómo. Cada vez que se procesa un DNI cuenta una vez, también al girar una foto o
            ajustar el recorte, así que son procesados y no personas.
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

      <form className="glass-card rounded-2xl p-4" onSubmit={(e) => e.preventDefault()} aria-label="Filtros">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
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
            onClick={() => cambiarFiltros({ desde: '', hasta: '' })}
            disabled={!hayFiltros}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={16} /> Quitar filtros
          </button>
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
          No se pudo cargar el resumen. {resultado.error}
        </div>
      )}

      {rangoValido && datos && (
        <div className={`space-y-6 transition-opacity ${cargando ? 'opacity-60' : ''}`} aria-busy={cargando}>
          {datos.registros === 0 ? (
            <p className="text-slate-400">No hay registros en estas fechas.</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                <Contador
                  titulo="Procesados"
                  valor={datos.registros}
                  detalle={datos.primero && datos.ultimo
                    ? `del ${formatearFecha(datos.primero, { conHora: false })} al ${formatearFecha(datos.ultimo, { conHora: false })}`
                    : null}
                  ayuda="Veces que se procesó un DNI en estas fechas"
                />
                <Contador
                  titulo="Recorte a mano"
                  valor={datos.recorteManual?.registros > 0 ? datos.recorteManual.veces : null}
                  total={datos.recorteManual?.registros}
                  ayuda={`Veces que hubo que recortar a mano alguna cara, de los procesados que guardan este dato (desde el ${fechaCorta(datos.recorteManual?.desde ?? '2026-01-30')})`}
                />
                <Contador
                  titulo="Censura a mano"
                  valor={datos.censuraManual}
                  total={datos.registros}
                  ayuda="Procesados en los que se abrió la censura manual en alguna cara, entera o para tapar lo que faltaba"
                />
                {['anverso', 'reverso'].map((cara) => (
                  <Contador
                    key={cara}
                    titulo={cara === 'anverso' ? 'Delantera tapada sola' : 'Trasera tapada sola'}
                    valor={datos.caras?.[cara]?.conDato > 0 ? datos.caras[cara].sola : null}
                    total={datos.caras?.[cara]?.conDato}
                    ayuda="Caras que se taparon solas, sin censura manual, de las que traen datos de detección (desde el 16/11/2026)"
                  />
                ))}
              </dl>

              <Actividad porDia={Array.isArray(datos.porDia) ? datos.porDia : []} desde={desde} hasta={hasta} />

              {Array.isArray(datos.perfiles) && datos.perfiles.length > 0 && (
                <Perfiles perfiles={datos.perfiles} registros={datos.registros} />
              )}

              <section aria-labelledby="casillas" className="glass-card rounded-2xl p-4 md:p-6 space-y-4">
                <div>
                  <h2 id="casillas" className="text-xl font-bold text-white">Qué se marca para tapar</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    De {formatearEntero(datos.conDeteccion)} procesados con datos de detección. Con un perfil predefinido
                    cuenta lo que marca el perfil, y con «Personalizado», lo que eligió la persona.
                  </p>
                </div>
                {datos.conDeteccion > 0 && datos.casillas ? (
                  <div className="grid gap-6 xl:grid-cols-2">
                    <TablaCasillas titulo="Parte delantera" cara="anverso" casillas={datos.casillas.anverso ?? []} />
                    <TablaCasillas titulo="Parte trasera" cara="reverso" casillas={datos.casillas.reverso ?? []} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Todavía no hay procesados con datos de detección en estas fechas.</p>
                )}
              </section>
            </>
          )}

          <div className="text-xs text-slate-400 flex gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>
              Los días son de España. Cada dato cuenta solo en los procesados que lo guardan de verdad. El recorte a mano
              se guarda desde el 29/01/2026 y se cuenta desde el día siguiente. Si cada cara se tapó sola y las casillas
              marcadas se cuentan solo en los procesados con datos de detección, que llegan desde el 16/11/2026 con los
              perfiles ya corregidos. Antes los perfiles predefinidos tapaban lo contrario de lo que decían.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumenPage;
