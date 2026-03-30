import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Task } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Truck, 
  Clock,
  MapPin,
  Map as MapIcon,
  Route,
  Zap
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../components/Modal';
import { Map } from '../components/Map';
import { optimizeRoute } from '../services/routeOptimizer';

// Error Boundary for Map
class MapErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[MapErrorBoundary] Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[400px] w-full flex flex-col items-center justify-center bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-sm text-stone-500 mb-2">Errore nel caricamento della mappa.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-blue-500 hover:underline"
          >
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [optimizedTasks, setOptimizedTasks] = useState<Task[]>([]);
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('dateTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dayTasks = tasks.filter(task => isSameDay(task.dateTime.toDate(), selectedDate));
    setSelectedDayTasks(dayTasks);
    setOptimizedTasks(dayTasks);
    setIsOptimized(false);
  }, [selectedDate, tasks]);

  const handleOptimize = () => {
    const optimized = optimizeRoute(selectedDayTasks);
    setOptimizedTasks(optimized);
    setIsOptimized(true);
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h1>
          <p className="text-stone-500">Visualizza e gestisci la pianificazione operativa.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-3 hover:bg-stone-100 rounded-2xl transition-colors border border-stone-200"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 hover:bg-stone-100 rounded-2xl transition-colors border border-stone-200 text-sm font-bold"
          >
            Oggi
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-3 hover:bg-stone-100 rounded-2xl transition-colors border border-stone-200"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day, i) => (
          <div key={i} className="text-center text-xs font-bold text-stone-400 uppercase tracking-widest py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const d = day;
        const dayTasks = tasks.filter(task => isSameDay(task.dateTime.toDate(), d));
        const isSelected = isSameDay(d, selectedDate);
        const isCurrentMonth = isSameMonth(d, monthStart);

        days.push(
          <div
            key={d.toString()}
            onClick={() => setSelectedDate(d)}
            className={cn(
              "min-h-[120px] p-2 border-r border-b border-stone-100 cursor-pointer transition-all relative group",
              !isCurrentMonth ? "bg-stone-50/50" : "bg-white",
              isSelected ? "ring-2 ring-inset ring-black z-10" : "hover:bg-stone-50"
            )}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold",
                isToday(d) ? "bg-black text-white" : isCurrentMonth ? "text-stone-900" : "text-stone-300"
              )}>
                {format(d, 'd')}
              </span>
              {dayTasks.length > 0 && (
                <span className="text-[10px] font-bold text-stone-400">{dayTasks.length} task</span>
              )}
            </div>
            <div className="space-y-1 overflow-hidden">
              {dayTasks.slice(0, 3).map((task) => (
                <div 
                  key={task.id}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold truncate flex items-center gap-1",
                    task.type === 'PICKUP' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600",
                    task.status === 'COMPLETED' && "opacity-50 line-through"
                  )}
                >
                  {task.type === 'PICKUP' ? <Package size={8} /> : <Truck size={8} />}
                  {task.contactName}
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div className="text-[9px] text-stone-400 font-bold pl-1">
                  + {dayTasks.length - 3} altri
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return <div className="border-t border-l border-stone-100 rounded-3xl overflow-hidden shadow-sm">{rows}</div>;
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {renderHeader()}
      
      <div className="flex flex-col xl:flex-row gap-10">
        <div className="flex-1">
          {renderDays()}
          {renderCells()}
        </div>

        <aside className="xl:w-96">
          <div className="bg-white border border-stone-200 rounded-[2rem] p-6 shadow-sm sticky top-10">
            <h2 className="text-xl font-bold mb-1 tracking-tight">
              {format(selectedDate, 'EEEE d MMMM', { locale: it })}
            </h2>
            <p className="text-stone-500 text-sm mb-6">Dettaglio attività per il giorno selezionato.</p>

            <div className="space-y-4">
              {selectedDayTasks.length === 0 ? (
                <div className="py-12 text-center text-stone-400 border-2 border-dashed border-stone-100 rounded-2xl">
                  Nessun task programmato.
                </div>
              ) : (
                selectedDayTasks.map((task) => (
                  <div key={task.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-stone-300 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        task.type === 'PICKUP' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                      )}>
                        {task.type === 'PICKUP' ? 'Ritiro' : 'Consegna'}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-stone-400">
                        <Clock size={12} />
                        {format(task.dateTime.toDate(), 'HH:mm')}
                      </div>
                    </div>
                    <h3 className="font-bold text-stone-900 mb-1">{task.contactName}</h3>
                    <div className="flex items-start gap-2 text-xs text-stone-500 mb-3">
                      <MapPin size={14} className="shrink-0 mt-0.5" />
                      <span>{task.address.street}, {task.address.city}</span>
                    </div>
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      task.status === 'COMPLETED' ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {task.status}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-2 mt-8">
              <button 
                onClick={() => setIsMapModalOpen(true)}
                className="flex-1 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
              >
                <MapIcon size={18} />
                Mappa Percorso
              </button>
              <button 
                onClick={() => window.print()}
                className="p-3 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-all"
              >
                <Clock size={18} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title={`Percorso del ${format(selectedDate, 'd MMMM', { locale: it })}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              Visualizza i punti di ritiro e consegna sulla mappa.
            </p>
            <button
              onClick={handleOptimize}
              disabled={isOptimized || selectedDayTasks.length < 2}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all",
                isOptimized 
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                  : "bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 disabled:opacity-50"
              )}
            >
              <Zap size={14} />
              {isOptimized ? 'Percorso Ottimizzato' : 'Ottimizza Percorso'}
            </button>
          </div>

          <MapErrorBoundary>
            <Map 
              key={`calendar-map-${optimizedTasks.filter(t => t.address.lat && t.address.lng).length}`}
              points={optimizedTasks
                .filter(t => t.address.lat && t.address.lng)
                .map(t => ({
                  lat: t.address.lat!,
                  lng: t.address.lng!,
                  label: t.contactName,
                  type: t.type
                }))
              }
              showRoute={true}
              className="h-[500px] w-full rounded-2xl overflow-hidden border border-stone-200 shadow-inner"
            />
          </MapErrorBoundary>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">Sequenza Fermate</h3>
              <div className="space-y-2">
                {optimizedTasks
                  .filter(t => t.address.lat && t.address.lng)
                  .map((task, index) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold text-white ${
                        task.type === 'PICKUP' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-stone-900">{task.contactName}</p>
                        <p className="text-[10px] text-stone-500 truncate">{task.address.street}, {task.address.city}</p>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                        task.type === 'PICKUP' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                      )}>
                        {task.type === 'PICKUP' ? 'Ritiro' : 'Consegna'}
                      </div>
                    </div>
                  ))}
                {optimizedTasks.some(t => !t.address.lat || !t.address.lng) && (
                  <p className="text-[10px] text-stone-400 italic pt-2">
                    * {optimizedTasks.filter(t => !t.address.lat || !t.address.lng).length} attività non geolocalizzate sono state omesse dalla mappa.
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-4">Statistiche Percorso</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Totale Fermate</span>
                  <span className="font-bold">{selectedDayTasks.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Punti Geolocalizzati</span>
                  <span className="font-bold">{selectedDayTasks.filter(t => t.address.lat && t.address.lng).length} / {selectedDayTasks.length}</span>
                </div>
                <div className="pt-4 border-t border-stone-200">
                  <p className="text-[10px] text-stone-400 italic">
                    * L'ottimizzazione utilizza un algoritmo di prossimità (Greedy Nearest Neighbor) per ridurre la distanza totale tra le tappe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
