import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Users, 
  Contact, 
  LogOut, 
  Menu, 
  X,
  Bell,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Calendar from './pages/Calendar';
import UserManagement from './pages/Users';
const Login = () => {
  const { login } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <div className="bg-white p-12 rounded-2xl shadow-xl max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-6 tracking-tight">LogiTrack</h1>
        <p className="text-stone-500 mb-8">Accedi per gestire i tuoi ritiri e consegne.</p>
        <button 
          onClick={login}
          className="w-full bg-black text-white py-4 rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Accedi con Google
        </button>
      </div>
    </div>
  );
};

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
  <Link 
    to={to} 
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      active ? "bg-black text-white shadow-lg" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

import { Notifications } from './components/Notifications';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { profile, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/calendar", icon: CalendarIcon, label: "Calendario" },
    { to: "/contacts", icon: Contact, label: "Anagrafiche" },
  ];

  if (isAdmin) {
    navItems.push({ to: "/users", icon: Users, label: "Utenti" });
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      <Notifications />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-stone-200 p-6">
        <div className="mb-12 px-4">
          <h1 className="text-2xl font-bold tracking-tighter">LogiTrack</h1>
          <p className="text-xs text-stone-400 uppercase tracking-widest mt-1">Enterprise Logistics</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <SidebarItem 
              key={item.to} 
              {...item} 
              active={location.pathname === item.to} 
            />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-stone-100">
          <div className="flex items-center gap-3 px-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
              <UserIcon size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{profile?.name || 'Utente'}</p>
              <p className="text-xs text-stone-400 truncate">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Esci</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 px-4 flex items-center justify-between z-50">
        <h1 className="text-xl font-bold tracking-tighter">LogiTrack</h1>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-stone-600">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 bg-white z-[60] p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-12">
              <h1 className="text-2xl font-bold tracking-tighter">LogiTrack</h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-stone-600">
                <X size={24} />
              </button>
            </div>
            <nav className="space-y-4">
              {navItems.map((item) => (
                <Link 
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl text-lg font-medium",
                    location.pathname === item.to ? "bg-black text-white" : "text-stone-600"
                  )}
                >
                  <item.icon size={24} />
                  {item.label}
                </Link>
              ))}
            </nav>
            <button 
              onClick={logout}
              className="mt-auto flex items-center gap-4 p-4 text-red-500 font-medium text-lg"
            >
              <LogOut size={24} />
              Esci
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-0 pt-16 md:pt-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

import { auth } from './firebase';
import { signOut } from 'firebase/auth';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-4 border-black border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  
  // If user is authenticated but has no profile, they might need to be invited or setup
  // For this demo, we'll auto-create a profile if it's the first time and they are the owner
  // or just show a "Not Authorized" screen.
  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 text-center">
      <div>
        <h2 className="text-2xl font-bold mb-2">Accesso Non Autorizzato</h2>
        <p className="text-stone-500 mb-6">Il tuo account non è ancora stato attivato da un amministratore.</p>
        <button onClick={() => signOut(auth)} className="text-black underline font-medium">Torna al login</button>
      </div>
    </div>
  );

  return <Layout>{children}</Layout>;
};

import Setup from './pages/Setup';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
          <Route path="/contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
