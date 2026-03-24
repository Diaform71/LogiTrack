import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, query, orderBy, where, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Task, TaskStatus, TaskType, Contact, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Calendar as CalendarIcon,
  User as UserIcon,
  ArrowRight,
  Package,
  Truck
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [contactId, setContactId] = useState('');
  const [type, setType] = useState<TaskType>('PICKUP');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);

  useEffect(() => {
    // Tasks listener
    const qTasks = query(collection(db, 'tasks'), orderBy('dateTime', 'desc'), limit(50));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    // Contacts listener
    const unsubContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact)));
    });

    // Users listener (only for admin to assign)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
    });

    return () => {
      unsubTasks();
      unsubContacts();
      unsubUsers();
    };
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    const dateTime = new Date(`${date}T${time}`);
    const assignedUser = users.find(u => u.uid === assignedTo);

    const taskData = {
      contactId,
      contactName: contact.name,
      type,
      address: contact.addresses[selectedAddressIndex],
      dateTime: Timestamp.fromDate(dateTime),
      status: 'PENDING',
      assignedTo: assignedTo || null,
      assignedName: assignedUser?.name || null,
      notes,
      createdAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'tasks'), taskData);
      setIsModalOpen(false);
      // Reset form
      setContactId('');
      setNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tasks');
    }
  };

  const updateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'COMPLETED') {
        updateData.completedAt = Timestamp.now();
      }
      await updateDoc(doc(db, 'tasks', taskId), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const stats = {
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-stone-500">Bentornato, ecco lo stato operativo di oggi.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2 hover:bg-stone-800 transition-all shadow-lg"
          >
            <Plus size={20} />
            Nuovo Task
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard label="In Attesa" value={stats.pending} icon={Clock} color="stone" />
        <StatCard label="In Corso" value={stats.inProgress} icon={AlertCircle} color="amber" />
        <StatCard label="Completati" value={stats.completed} icon={CheckCircle2} color="emerald" />
      </div>

      <div className="bg-white border border-stone-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Attività Recenti</h2>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Ultimi 50 Task</span>
        </div>
        <div className="divide-y divide-stone-100">
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-stone-400">Nessun task trovato.</div>
          ) : (
            tasks.map((task) => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onStatusChange={updateStatus}
                canEdit={isAdmin || task.assignedTo === profile?.uid}
              />
            ))
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crea Nuovo Task">
        <form onSubmit={handleCreateTask} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Contatto</label>
            <select 
              required
              value={contactId}
              onChange={(e) => {
                setContactId(e.target.value);
                setSelectedAddressIndex(0);
              }}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="">Seleziona un contatto...</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          {contactId && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">Indirizzo di Ritiro/Consegna</label>
              <select 
                value={selectedAddressIndex}
                onChange={(e) => setSelectedAddressIndex(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                {contacts.find(c => c.id === contactId)?.addresses.map((addr, i) => (
                  <option key={i} value={i}>{addr.label}: {addr.street}, {addr.city}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">Tipo Attività</label>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setType('PICKUP')}
                  className={cn(
                    "flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                    type === 'PICKUP' ? "bg-black text-white border-black" : "bg-white text-stone-500 border-stone-200"
                  )}
                >
                  <Package size={18} /> Ritiro
                </button>
                <button 
                  type="button"
                  onClick={() => setType('DELIVERY')}
                  className={cn(
                    "flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                    type === 'DELIVERY' ? "bg-black text-white border-black" : "bg-white text-stone-500 border-stone-200"
                  )}
                >
                  <Truck size={18} /> Consegna
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">Assegnato a</label>
              <select 
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="">Nessun assegnatario</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">Data</label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">Ora</label>
              <input 
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Note</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[80px]"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg"
          >
            Crea Task
          </button>
        </form>
      </Modal>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    stone: "bg-stone-100 text-stone-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };
  return (
    <div className="bg-white border border-stone-200 p-6 rounded-[2rem] flex items-center gap-5">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", colors[color])}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function TaskRow({ task, onStatusChange, canEdit }: { task: Task, onStatusChange: any, canEdit: boolean }) {
  const statusColors = {
    PENDING: "bg-stone-100 text-stone-500",
    IN_PROGRESS: "bg-amber-100 text-amber-600",
    COMPLETED: "bg-emerald-100 text-emerald-600",
  };

  const typeIcon = task.type === 'PICKUP' ? <Package size={16} /> : <Truck size={16} />;

  return (
    <div className="p-6 hover:bg-stone-50 transition-colors group">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex items-center gap-4 lg:w-1/4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            task.type === 'PICKUP' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
          )}>
            {typeIcon}
          </div>
          <div>
            <h4 className="font-bold text-stone-900 leading-tight">{task.contactName}</h4>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-tighter">
              {task.type === 'PICKUP' ? 'Ritiro' : 'Consegna'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:w-1/4 text-sm text-stone-500">
          <MapPin size={16} className="shrink-0" />
          <span className="truncate">{task.address.street}, {task.address.city}</span>
        </div>

        <div className="flex items-center gap-3 lg:w-1/5 text-sm text-stone-500">
          <CalendarIcon size={16} className="shrink-0" />
          <span>{format(task.dateTime.toDate(), 'dd MMM, HH:mm', { locale: it })}</span>
        </div>

        <div className="flex items-center gap-3 lg:w-1/6">
          <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", statusColors[task.status])}>
            {task.status === 'PENDING' ? 'In Attesa' : task.status === 'IN_PROGRESS' ? 'In Corso' : 'Completato'}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 lg:flex-1">
          {canEdit && task.status !== 'COMPLETED' && (
            <div className="flex gap-2">
              {task.status === 'PENDING' && (
                <button 
                  onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors text-xs font-bold"
                >
                  Inizia
                </button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <button 
                  onClick={() => onStatusChange(task.id, 'COMPLETED')}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-bold"
                >
                  Completa
                </button>
              )}
            </div>
          )}
          {task.assignedName && (
            <div className="flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-lg text-[10px] font-medium text-stone-600">
              <UserIcon size={12} />
              {task.assignedName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
