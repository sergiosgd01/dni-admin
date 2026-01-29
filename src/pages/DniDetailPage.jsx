import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dniService } from '../services/api';
import { ArrowLeft, Trash2, CheckCircle, XCircle, CreditCard, FileText, AlertCircle, Shield, Eye, EyeOff, Clock, Tag, Droplets, Fingerprint, PenTool } from 'lucide-react';
import { motion } from 'framer-motion';

// Mapeo de nombres de perfiles para mostrar
const PROFILE_LABELS = {
    viajes: { label: 'Viajes', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    salud: { label: 'Salud', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    administrativo: { label: 'Administrativo', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    financiero: { label: 'Financiero', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    personalizado: { label: 'Personalizado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

// Mapeo de nombres de campos para mostrar en español
const FIELD_LABELS = {
    // Campos frontales
    nombre: 'Nombre',
    apellidos: 'Apellidos',
    dni: 'Número DNI',
    fechaNacimiento: 'Fecha Nacimiento',
    sexo: 'Sexo',
    nacionalidad: 'Nacionalidad',
    fechaExpedicion: 'Fecha Expedición',
    fechaCaducidad: 'Fecha Caducidad',
    numeroSoporte: 'Nº Soporte',
    can: 'CAN',
    firma: 'Firma',
    // Campos traseros
    mrz: 'MRZ',
    domicilio: 'Domicilio',
    municipio: 'Municipio',
    provincia: 'Provincia',
    equipoExpedidor: 'Equipo Expedidor',
    progenitores: 'Progenitores',
};

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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderBooleanIndicator = (value, trueText = 'Sí', falseText = 'No') => {
        if (value === null || value === undefined) {
            return <span className="text-slate-500">N/A</span>;
        }
        return value ? (
            <span className="text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> {trueText}
            </span>
        ) : (
            <span className="text-red-400 flex items-center gap-1">
                <XCircle size={14} /> {falseText}
            </span>
        );
    };

    // Lógica: true = campo oculto/censurado, false = campo visible
    const renderFieldStatus = (isHidden) => {
        return isHidden ? (
            <div className="flex items-center gap-2 text-red-400">
                <EyeOff size={14} />
                <span className="text-xs">Oculto</span>
            </div>
        ) : (
            <div className="flex items-center gap-2 text-green-400">
                <Eye size={14} />
                <span className="text-xs">Visible</span>
            </div>
        );
    };

    if (loading) return <div className="text-white p-10">Cargando...</div>;
    if (!dni) return null;

    const profileInfo = PROFILE_LABELS[dni.profileUsed] || PROFILE_LABELS.personalizado;

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
                    {/* Header: DNI Number + Profile + Validation */}
                    <div className="glass-card p-8 rounded-2xl">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                            <div className="overflow-hidden">
                                <p className="text-sm text-slate-400">Número de Documento</p>
                                <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mt-1 break-all">{dni.dniNumber}</h1>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {dni.profileUsed && (
                                    <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-sm font-medium ${profileInfo.color}`}>
                                        <Tag size={14} />
                                        {profileInfo.label}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Processing Metadata */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 border-b border-primary-500/20 pb-2 flex items-center gap-2">
                                <Shield size={16} />
                                Metadatos de Procesamiento
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-2">
                                        <Fingerprint size={12} />
                                        Holograma
                                    </div>
                                    {renderBooleanIndicator(dni.hologramReadable, 'Legible', 'No Legible')}
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-2">
                                        <Droplets size={12} />
                                        Homogeneidad
                                    </div>
                                    <span className="text-white font-medium text-lg">
                                        {dni.homogenityPassed !== null && dni.homogenityPassed !== undefined ? `${Number(dni.homogenityPassed).toFixed(2)}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-2">
                                        <PenTool size={12} />
                                        Censura Manual
                                    </div>
                                    {renderBooleanIndicator(dni.manualCensor)}
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-2">
                                        <Eye size={12} />
                                        Detección Manual
                                    </div>
                                    {renderBooleanIndicator(dni.manualDetection)}
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-2">
                                        <FileText size={12} />
                                        Marca de Agua
                                    </div>
                                    {dni.watermarkText ? (
                                        <span className="text-white text-sm truncate block" title={dni.watermarkText}>
                                            {dni.watermarkText}
                                        </span>
                                    ) : (
                                        <span className="text-slate-500">N/A</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Hidden Fields */}
                        {dni.hiddenFields && (
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 border-b border-primary-500/20 pb-2 flex items-center gap-2">
                                    <Eye size={16} />
                                    Campos Visibles / Ocultos
                                </h3>

                                {/* Front Fields */}
                                {dni.hiddenFields.frontFields && (
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-400 uppercase mb-2 font-semibold">Cara Frontal</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {Object.entries(dni.hiddenFields.frontFields).map(([field, isVisible]) => (
                                                <div key={field} className="bg-white/5 px-3 py-2 rounded-lg flex items-center justify-between">
                                                    <span className="text-white text-xs">{FIELD_LABELS[field] || field}</span>
                                                    {renderFieldStatus(isVisible)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Back Fields */}
                                {dni.hiddenFields.backFields && (
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase mb-2 font-semibold">Cara Trasera</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {Object.entries(dni.hiddenFields.backFields).map(([field, isVisible]) => (
                                                <div key={field} className="bg-white/5 px-3 py-2 rounded-lg flex items-center justify-between">
                                                    <span className="text-white text-xs">{FIELD_LABELS[field] || field}</span>
                                                    {renderFieldStatus(isVisible)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* OCR Data */}
                        <div className="space-y-6">
                            {dni.ocrFrontData && Object.keys(dni.ocrFrontData).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 border-b border-primary-500/20 pb-2">
                                        Datos OCR (Frontal)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(dni.ocrFrontData).map(([key, value]) => (
                                            <div key={key} className="bg-white/5 p-3 rounded-lg overflow-hidden">
                                                <span className="block text-xs text-slate-400 uppercase mb-1">{FIELD_LABELS[key] || key}</span>
                                                <span className="text-white font-medium break-all text-sm">
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {dni.ocrBackData && Object.keys(dni.ocrBackData).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4 border-b border-primary-500/20 pb-2">
                                        Datos OCR (Trasera)
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.entries(dni.ocrBackData).map(([key, value]) => (
                                            <div key={key} className="bg-white/5 p-3 rounded-lg overflow-hidden">
                                                <span className="block text-xs text-slate-400 uppercase mb-1">{FIELD_LABELS[key] || key}</span>
                                                <span className="text-white font-medium break-all text-sm">
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Timestamps */}
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Clock size={12} />
                                    <span>Creado: {formatDate(dni.createdAt)}</span>
                                </div>
                                {dni.updatedAt && dni.updatedAt !== dni.createdAt && (
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} />
                                        <span>Actualizado: {formatDate(dni.updatedAt)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Delete Button */}
                        <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
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
