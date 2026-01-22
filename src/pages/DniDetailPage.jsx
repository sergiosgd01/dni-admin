import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dniService } from '../services/api';
import { ArrowLeft, Trash2, CheckCircle, XCircle, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const DniDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dni, setDni] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDni();
    }, [id]);

    const fetchDni = async () => {
        try {
            const response = await dniService.getById(id);
            // Backend returns: { success: true, data: { ... } }
            // Axios response.data is the wrapper object
            setDni(response.data.data);
        } catch (err) {
            console.error(err);
            alert('Error fetching DNI or not found');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('¿ELIMINAR ESTE DOCUMENTO? Esta acción no se puede deshacer.')) {
            try {
                await dniService.delete(id);
                navigate('/');
            } catch (err) {
                alert('Error al eliminar');
            }
        }
    };

    if (loading) return <div className="text-white p-10">Cargando...</div>;
    if (!dni) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={20} /> Volver al Listado
            </button>

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* Left Column: Images */}
                <div className="w-full xl:w-1/2 space-y-6">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-primary-500" />
                            Imagen Frontal
                        </h3>
                        <div className="rounded-xl overflow-hidden bg-dark-900 border border-white/5 relative group">
                            {dni.frontImageUrl ? (
                                <img src={dni.frontImageUrl} alt="Front" className="w-full h-auto object-contain" />
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-600">No Image</div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-primary-500" />
                            Imagen Trasera
                        </h3>
                        <div className="rounded-xl overflow-hidden bg-dark-900 border border-white/5 relative">
                            {dni.backImageUrl ? (
                                <img src={dni.backImageUrl} alt="Back" className="w-full h-auto object-contain" />
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-600">No Image</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Data */}
                <div className="w-full xl:w-1/2 space-y-6">
                    <div className="glass-card p-8 rounded-2xl">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                            <div className="overflow-hidden">
                                <p className="text-sm text-slate-400">Número de Documento</p>
                                <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mt-1 break-all">{dni.dniNumber}</h1>
                            </div>
                            {dni.validation?.ok ? (
                                <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-400 shrink-0">
                                    <CheckCircle size={20} />
                                    <span className="font-bold">Validado</span>
                                </div>
                            ) : (
                                <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2 text-yellow-400">
                                    <AlertCircle size={20} /> {/* Assuming AlertCircle is imported or use XCircle */}
                                    <span className="font-bold">Pendiente</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 border-b border-primary-500/20 pb-2">
                                    Datos OCR (Frontal)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {dni.ocrFrontData && Object.entries(dni.ocrFrontData).map(([key, value]) => (
                                        <div key={key} className="bg-white/5 p-3 rounded-lg overflow-hidden">
                                            <span className="block text-xs text-slate-400 uppercase mb-1">{key}</span>
                                            <span className="text-white font-medium break-all">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {dni.ocrBackData && (
                                <div>
                                    <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 border-b border-primary-500/20 pb-2">
                                        Datos OCR (Trasera)
                                    </h3>
                                    <div className="bg-dark-900 p-4 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto">
                                        <pre>{JSON.stringify(dni.ocrBackData, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all font-medium"
                            >
                                <Trash2 size={20} />
                                Eliminar Registro Definitivamente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DniDetailPage;
