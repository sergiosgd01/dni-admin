import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dniService } from '../services/api';
import { Search, Loader2, AlertCircle, Eye, Trash2, Calendar, FileText, CheckCircle, Shield, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardPage = () => {
  const [dnis, setDnis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [error, setError] = useState(null);

  // Usage check state
  const [checkDniNumber, setCheckDniNumber] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);

  useEffect(() => {
    fetchDnis();
  }, []);

  const fetchDnis = async () => {
    try {
      setLoading(true);
      const response = await dniService.getAll();
      // The backend returns { success: true, count: N, data: [...] }
      // Axios response.data is equivalent to the entire JSON body.
      // So we need response.data.data to get the array.
      setDnis(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos. Asegúrate de que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault(); // Prevent navigation
    if (window.confirm('¿Estás seguro de eliminar este registro?')) {
      try {
        await dniService.delete(id);
        setDnis(dnis.filter(d => d._id !== id));
      } catch (err) {
        alert('Error al eliminar');
      }
    }
  };

  const handleCheckUsage = async (e) => {
    e.preventDefault();
    if (!checkDniNumber.trim()) return;

    try {
      setChecking(true);
      setCheckError(null);
      setCheckResult(null);
      const response = await dniService.getUsageCount(checkDniNumber);
      setCheckResult(response.data.data);
    } catch (err) {
      console.error(err);
      setCheckError(err.response?.data?.message || 'Error al comprobar el DNI');
    } finally {
      setChecking(false);
    }
  };

  // Calcular cuántas veces aparece cada hash para mostrar el contador
  const hashCounts = {};
  dnis.forEach(d => {
    if (d.dniHash) {
      hashCounts[d.dniHash] = (hashCounts[d.dniHash] || 0) + 1;
    }
  });
  const filteredDnis = dnis.filter(dni =>
    dni.dniHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dni.profileUsed?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedDnis = [...filteredDnis].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Manejo especial para datos anidados u otros casos
    if (sortConfig.key === 'perfil') {
      aValue = a.profileUsed || '';
      bValue = b.profileUsed || '';
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="animate-spin text-primary-500" size={48} />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Resumen y gestión de documentos escaneados</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-dark-800 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => handleSort('createdAt')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${sortConfig.key === 'createdAt'
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Calendar size={14} /> Fecha
              {sortConfig.key === 'createdAt' && (
                <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button
              onClick={() => handleSort('perfil')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${sortConfig.key === 'perfil'
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <User size={14} /> Perfil
              {sortConfig.key === 'perfil' && (
                <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          </div>
        </div>

        <div className="bg-dark-800 p-4 rounded-xl border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-primary-500/10 rounded-lg text-primary-500">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider">Total Registros</p>
            <p className="text-2xl font-bold text-white">{dnis.length}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input
          type="text"
          placeholder="Buscar por Hash o Perfil..."
          className="w-full bg-dark-800 border-none rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-primary-500/50 transition-all shadow-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Usage Check Section */}
      <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="text-primary-500" size={24} />
          <h2 className="text-xl font-bold text-white">Comprobar Usos de DNI</h2>
        </div>
        <p className="text-slate-400 text-sm">Introduce el número de DNI manual para verificar cuántas veces ha sido procesado por el sistema.</p>
        <form onSubmit={handleCheckUsage} className="flex gap-4">
          <input
            type="text"
            placeholder="Ej: 12345678A"
            className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500"
            value={checkDniNumber}
            onChange={(e) => setCheckDniNumber(e.target.value)}
          />
          <button
            type="submit"
            disabled={checking || !checkDniNumber.trim()}
            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:hover:bg-primary-500 text-white px-6 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {checking ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Comprobar
          </button>
        </form>

        {checkError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            {checkError}
          </div>
        )}

        {checkResult && (
          <div className="mt-4 p-4 bg-dark-900 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-300">Total de veces procesado:</span>
              <span className="text-2xl font-bold text-white">{checkResult.usageCount}</span>
            </div>
            {checkResult.recentUsage?.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-400">Usos Recientes:</span>
                {checkResult.recentUsage.map((usage, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary-400" />
                      <span className="text-slate-300">{new Date(usage.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {usage.profile && <span className="px-2 py-0.5 bg-dark-800 rounded text-slate-400 text-xs">{usage.profile}</span>}
                      {usage.validation?.ok ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={12} /> Válido</span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500 text-xs">Info</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {filteredDnis.length === 0 && !loading && !error && (
        <div className="text-center py-20 text-slate-500">
          <div className="inline-block p-6 bg-dark-800 rounded-full mb-4">
            <Search size={48} className="text-slate-600" />
          </div>
          <p className="text-lg">No se encontraron registros</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {sortedDnis.map((dni, index) => (
            <motion.div
              key={dni._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card group hover:border-primary-500/30 transition-all rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-dark-900 border-b border-white/5 p-4 flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent" />
                <span className="text-xl font-mono font-bold text-white tracking-widest relative z-10 truncate" title={dni.dniHash}>
                  {dni.dniHash ? `${dni.dniHash.substring(0, 12)}...` : 'DNI Cifrado'}
                </span>
                <div className="relative z-10 shrink-0 ml-2">
                  <div className="px-2 py-1 rounded-md text-xs font-medium bg-dark-800 text-slate-400 border border-white/5 flex items-center gap-1.5" title="Veces que este DNI ha sido procesado en el sistema">
                    <History size={12} className="text-primary-500" />
                    <span>{hashCounts[dni.dniHash] || 1} {hashCounts[dni.dniHash] === 1 ? 'vez' : 'veces'}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-300">
                    <User size={16} className="text-primary-500" />
                    <span className="font-medium truncate capitalize">
                      {dni.profileUsed ? `Perfil: ${dni.profileUsed}` : 'Perfil No Especificado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Calendar size={16} />
                    <span>
                      {dni.createdAt
                        ? new Date(dni.createdAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        : 'Sin fecha'}
                    </span>
                  </div>

                  {/* Nuevos indicadores solicitados */}
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Censura Manual:</span>
                      <span className={`px-1.5 py-0.5 rounded ${dni.manualCensor ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/30 text-slate-500'}`}>
                        {dni.manualCensor ? 'Sí' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Detección Manual:</span>
                      <span className={`px-1.5 py-0.5 rounded ${dni.manualDetection ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/30 text-slate-500'}`}>
                        {dni.manualDetection ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex gap-3">
                  <Link
                    to={`/dni/${dni._id}`}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white text-center rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={16} /> Ver Detalles
                  </Link>
                  <button
                    onClick={(e) => handleDelete(e, dni._id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Simple User icon component since it's not imported above in map
const User = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default DashboardPage;
