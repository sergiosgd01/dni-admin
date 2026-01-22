import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, LayoutDashboard, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-dark-800 border-b border-white/5 p-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary-500/20 rounded-lg text-primary-500">
                        <ShieldCheck size={20} />
                    </div>
                    <span className="font-bold text-lg">DNI Admin</span>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar (Desktop + Mobile Overlay) */}
            <AnimatePresence>
                {(isSidebarOpen || window.innerWidth >= 768) && (
                    <>
                        {/* Mobile Overlay */}
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsSidebarOpen(false)}
                                className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                            />
                        )}

                        <motion.aside
                            initial={false}
                            animate={{ x: 0 }}
                            className={`
                                fixed md:sticky top-0 left-0 h-full w-64 bg-dark-800 border-r border-white/5 flex flex-col z-50
                                transition-transform duration-300 ease-in-out
                                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                            `}
                        >
                            <div className="p-6 hidden md:flex items-center gap-3">
                                <div className="p-2 bg-primary-500/20 rounded-lg text-primary-500">
                                    <ShieldCheck size={24} />
                                </div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                    DNI Admin
                                </h1>
                            </div>

                            <nav className="flex-1 px-4 py-4 space-y-2 mt-4 md:mt-0">
                                <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary-500/10 text-primary-500 rounded-xl transition-all">
                                    <LayoutDashboard size={20} />
                                    <span className="font-medium">Dashboard</span>
                                </button>
                            </nav>

                            <div className="p-4 border-t border-white/5">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    <LogOut size={20} />
                                    <span className="font-medium">Cerrar Sesión</span>
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-dark-900 relative w-full">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-96 bg-primary-500/5 blur-[100px] pointer-events-none" />

                <div className="relative p-4 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
