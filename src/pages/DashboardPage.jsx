import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, FileText, Loader2, RefreshCw, Search, Trash2,
} from 'lucide-react';
import { dniService, describirError, esCancelacion } from '../services/api';
import { fiabilidadMetrica, perfilDe } from '../constants/campos';
import { CLASES_ESPERADAS } from '../constants/clases';
import { formatearEntero, formatearFecha } from '../utils/formato';

const TAMANOS_PAGINA = [10, 25, 50, 100];
const POR_PAGINA_DEFECTO = 25;

// La página y el tamaño van en la dirección, así «Volver» desde el detalle regresa a la misma página
const leerPagina = (texto) => {
  const numero = Number.parseInt(texto, 10);
  return Number.isFinite(numero) && numero >= 1 ? numero : 1;
};

const leerPorPagina = (texto) => {
  const numero = Number.parseInt(texto, 10);
  return TAMANOS_PAGINA.includes(numero) ? numero : POR_PAGINA_DEFECTO;
};

const SiNo = ({ valor, sinDato = false }) => {
  if (sinDato || typeof valor !== 'boolean') {
    return <span className="text-slate-500 text-xs">Sin dato</span>;
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs ${valor ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-700/30 text-slate-400'}`}>
      {valor ? 'Sí' : 'No'}
    </span>
  );
};

// Cuántas de las clases esperadas en una cara encontró el detector, para ver de un vistazo qué procesados fallaron
const ResumenCara = ({ nombre, cara, idCara }) => {
  if (cara === null || cara === undefined) return null;

  if (!cara.caraDetectada) {
    return (
      <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-300" title="El detector no encontró el documento en esta cara">
        {nombre}: sin documento
      </span>
    );
  }

  const esperadas = CLASES_ESPERADAS[idCara];
  const vistas = esperadas.filter((clase) => Number.isFinite(cara.clases?.[clase])).length;
  const completa = vistas === esperadas.length;

  return (
    <span
      className={`px-1.5 py-0.5 rounded text-xs tabular-nums ${completa ? 'bg-green-500/10 text-green-300' : 'bg-amber-500/10 text-amber-300'}`}
      title={`${vistas} de ${esperadas.length} clases esperadas detectadas${cara.automatica === false ? ', censura manual' : ''}`}
    >
      {nombre} {vistas}/{esperadas.length}{cara.automatica === false ? ' · manual' : ''}
    </span>
  );
};

const ResumenDeteccion = ({ deteccion }) => {
  if (!deteccion) {
    return <span className="text-slate-600 text-xs" title="Registro anterior a la detección por campo">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      <ResumenCara nombre="Anverso" idCara="anverso" cara={deteccion.anverso} />
      {deteccion.reverso ? (
        <ResumenCara nombre="Reverso" idCara="reverso" cara={deteccion.reverso} />
      ) : (
        <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700/30 text-slate-400">Sin reverso</span>
      )}
    </div>
  );
};

const BotonPagina = ({ etiqueta, onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={etiqueta}
    title={etiqueta}
    className="p-2 rounded-lg bg-dark-800 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-dark-800"
  >
    {children}
  </button>
);

const Paginacion = ({ etiqueta, pagina, totalPaginas, porPagina, primero, ultimo, total, cargando, onPagina, onPorPagina }) => (
  <nav aria-label={etiqueta} className="flex flex-col md:flex-row md:items-center gap-3">
    <div className="flex items-center justify-between gap-3 md:flex-1">
      <p className="text-sm text-slate-400 tabular-nums flex items-center gap-2">
        {total > 0 && ultimo >= primero
          ? `Registros ${formatearEntero(primero)} a ${formatearEntero(ultimo)} de ${formatearEntero(total)}`
          : `${formatearEntero(total)} registros`}
        {cargando && <Loader2 size={14} className="animate-spin text-primary-500" aria-label="Cargando" />}
      </p>
      <label className="text-sm text-slate-400 flex items-center gap-2">
        Por página
        <select
          value={porPagina}
          onChange={(e) => onPorPagina(Number(e.target.value))}
          className="bg-dark-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm"
        >
          {TAMANOS_PAGINA.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
    </div>
    <div className="flex items-center justify-between md:justify-end gap-2">
      <BotonPagina etiqueta="Primera página" onClick={() => onPagina(1)} disabled={pagina <= 1}>
        <ChevronsLeft size={16} />
      </BotonPagina>
      <BotonPagina etiqueta="Página anterior" onClick={() => onPagina(pagina - 1)} disabled={pagina <= 1}>
        <ChevronLeft size={16} />
      </BotonPagina>
      <span className="text-sm text-slate-300 tabular-nums px-1" aria-live="polite">
        Página {formatearEntero(pagina)} de {formatearEntero(Math.max(totalPaginas, 1))}
      </span>
      <BotonPagina etiqueta="Página siguiente" onClick={() => onPagina(pagina + 1)} disabled={pagina >= totalPaginas}>
        <ChevronRight size={16} />
      </BotonPagina>
      <BotonPagina etiqueta="Última página" onClick={() => onPagina(totalPaginas)} disabled={pagina >= totalPaginas}>
        <ChevronsRight size={16} />
      </BotonPagina>
    </div>
  </nav>
);

const DashboardPage = () => {
  const [params, setParams] = useSearchParams();
  const pagina = leerPagina(params.get('pagina'));
  const porPagina = leerPorPagina(params.get('porPagina'));

  const [recargas, setRecargas] = useState(0);
  // Última respuesta recibida y la petición a la que corresponde. Mientras llega la siguiente
  // se sigue viendo la anterior, y si llega una respuesta atrasada se descarta
  const [resultado, setResultado] = useState(null);
  const [errorBorrado, setErrorBorrado] = useState(null);
  const [borrando, setBorrando] = useState(null);

  const clave = `${pagina}|${porPagina}|${recargas}`;

  useEffect(() => {
    const controller = new AbortController();
    dniService
      .list({ page: pagina, limit: porPagina }, controller.signal)
      .then((datos) => setResultado({ clave, datos, error: null }))
      .catch((error) => {
        if (!esCancelacion(error)) setResultado({ clave, datos: null, error: describirError(error) });
      });
    return () => controller.abort();
  }, [clave, pagina, porPagina]);

  const cargando = resultado?.clave !== clave;
  const datos = resultado?.datos;
  const registros = datos?.data ?? [];
  // Si el backend todavía no pagina, devuelve todos los registros sin total ni páginas
  const total = Number.isFinite(datos?.total) ? datos.total : registros.length;
  const totalPaginas = Number.isFinite(datos?.totalPages) ? datos.totalPages : 1;
  // El rango sale de la página que se está viendo, que mientras carga la siguiente sigue siendo la anterior
  const limite = Number.isFinite(datos?.limit) ? datos.limit : porPagina;
  const paginaVista = Number.isFinite(datos?.page) ? datos.page : pagina;
  const primero = (paginaVista - 1) * limite + 1;
  const ultimo = primero + registros.length - 1;

  const irAPagina = (nueva, nuevoPorPagina = porPagina) => {
    const siguientes = {};
    if (nueva > 1) siguientes.pagina = String(nueva);
    if (nuevoPorPagina !== POR_PAGINA_DEFECTO) siguientes.porPagina = String(nuevoPorPagina);
    setParams(siguientes);
    window.scrollTo({ top: 0 });
  };

  // Al cambiar el tamaño de página se queda en la página que contiene el primer registro que se veía
  const cambiarPorPagina = (nuevo) => irAPagina(Math.floor(((pagina - 1) * porPagina) / nuevo) + 1, nuevo);

  const borrar = async (registro) => {
    if (!window.confirm(`¿Eliminar el registro #${String(registro._id).slice(-6)}? No se puede deshacer.`)) return;

    setBorrando(registro._id);
    setErrorBorrado(null);
    try {
      await dniService.delete(registro._id);
      setRecargas((n) => n + 1);
    } catch (error) {
      setErrorBorrado(describirError(error, { 404: 'Ese registro ya no existe. Recarga el listado.' }));
    } finally {
      setBorrando(null);
    }
  };

  if (!resultado) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={48} aria-label="Cargando registros" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Registros</h1>
          <p className="text-slate-400">
            Una fila por cada DNI procesado en la web. Solo métricas anónimas, sin ningún dato del documento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRecargas((n) => n + 1)}
            className="p-3 rounded-xl bg-dark-800 border border-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Recargar el listado"
            title="Recargar el listado"
          >
            <RefreshCw size={20} className={cargando ? 'animate-spin' : ''} />
          </button>
          <div className="bg-dark-800 p-4 rounded-xl border border-white/5 flex items-center gap-4">
            <div className="p-3 bg-primary-500/10 rounded-lg text-primary-500">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Total de registros</p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {datos ? formatearEntero(total) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {resultado.error && (
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} className="shrink-0" />
          No se pudieron cargar los registros. {resultado.error}
        </div>
      )}

      {errorBorrado && (
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} className="shrink-0" />
          No se pudo eliminar el registro. {errorBorrado}
        </div>
      )}

      {datos && (
        <>
          <Paginacion
            etiqueta="Paginación del listado"
            pagina={pagina}
            totalPaginas={totalPaginas}
            porPagina={porPagina}
            primero={primero}
            ultimo={ultimo}
            total={total}
            cargando={cargando}
            onPagina={irAPagina}
            onPorPagina={cambiarPorPagina}
          />

          {registros.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="inline-block p-6 bg-dark-800 rounded-full mb-4">
                <Search size={40} className="text-slate-600" />
              </div>
              {total > 0 && pagina > totalPaginas ? (
                <>
                  <p className="text-lg">Esta página ya no tiene registros.</p>
                  <button
                    type="button"
                    onClick={() => irAPagina(totalPaginas)}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm"
                  >
                    Ir a la última página
                  </button>
                </>
              ) : (
                <p className="text-lg">Todavía no hay registros</p>
              )}
            </div>
          ) : (
            <div className={`glass-card rounded-2xl overflow-x-auto transition-opacity ${cargando ? 'opacity-60' : ''}`}>
              <table className="w-full text-sm">
                <caption className="sr-only">Registros de uso, del más reciente al más antiguo</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
                    <th scope="col" className="px-4 py-3 font-medium">Registro</th>
                    <th scope="col" className="px-4 py-3 font-medium hidden md:table-cell">Fecha</th>
                    <th scope="col" className="px-4 py-3 font-medium">Perfil</th>
                    <th scope="col" className="px-4 py-3 font-medium hidden lg:table-cell">Recorte manual</th>
                    <th scope="col" className="px-4 py-3 font-medium hidden lg:table-cell">Censura manual</th>
                    <th scope="col" className="px-4 py-3 font-medium hidden md:table-cell">Detección por campo</th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((registro) => {
                    const perfil = perfilDe(registro.profileUsed);
                    return (
                      <tr key={registro._id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <Link to={`/dni/${registro._id}`} className="font-mono text-white hover:text-primary-400" title={registro._id}>
                            #{String(registro._id).slice(-6)}
                          </Link>
                          <p className="text-xs text-slate-500 md:hidden mt-0.5">{formatearFecha(registro.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap hidden md:table-cell tabular-nums">
                          {formatearFecha(registro.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {perfil ? (
                            <span className={`px-2 py-0.5 rounded border text-xs whitespace-nowrap ${perfil.color}`}>{perfil.nombre}</span>
                          ) : (
                            <span className="text-slate-500 text-xs">Sin dato</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <SiNo valor={registro.manualDetection} sinDato={fiabilidadMetrica(registro, 'manualDetection') === 'sin-datos'} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <SiNo valor={registro.manualCensor} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <ResumenDeteccion deteccion={registro.deteccion} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/dni/${registro._id}`}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition-colors"
                              aria-label={`Ver el registro #${String(registro._id).slice(-6)}`}
                              title="Ver detalles"
                            >
                              <Eye size={16} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => borrar(registro)}
                              disabled={borrando === registro._id}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                              aria-label={`Eliminar el registro #${String(registro._id).slice(-6)}`}
                              title="Eliminar"
                            >
                              {borrando === registro._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {registros.length > 10 && (
            <Paginacion
              etiqueta="Paginación del listado, abajo"
              pagina={pagina}
              totalPaginas={totalPaginas}
              porPagina={porPagina}
              primero={primero}
              ultimo={ultimo}
              total={total}
              cargando={cargando}
              onPagina={irAPagina}
              onPorPagina={cambiarPorPagina}
            />
          )}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
