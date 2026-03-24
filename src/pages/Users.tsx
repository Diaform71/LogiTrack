import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Invitation, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Mail, Shield, CheckCircle2, XCircle, UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('MEMBER');

  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
    });

    const unsubInvs = onSnapshot(query(collection(db, 'invitations'), orderBy('expiresAt', 'desc')), (snapshot) => {
      setInvitations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invitation)));
    });

    return () => {
      unsubUsers();
      unsubInvs();
    };
  }, [isAdmin]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invData = {
      email,
      role,
      token,
      used: false,
      expiresAt: Timestamp.fromDate(expiresAt)
    };

    try {
      await addDoc(collection(db, 'invitations'), invData);
      setIsModalOpen(false);
      setEmail('');
      // In a real app, you'd send an email here.
      alert(`Invito creato! Token: ${token}\nInvia questo link: ${window.location.origin}/setup?token=${token}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'invitations');
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { active: !user.active });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (!isAdmin) return <div className="p-10">Accesso negato.</div>;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Gestione Utenti</h1>
          <p className="text-stone-500">Gestisci i membri del team e gli inviti.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2 hover:bg-stone-800 transition-all shadow-lg"
        >
          <UserPlus size={20} />
          Invita Utente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShieldCheck className="text-stone-400" size={24} />
            Utenti Attivi
          </h2>
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden divide-y divide-stone-100">
            {users.map((user) => (
              <div key={user.uid} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold">{user.name}</h3>
                    <p className="text-sm text-stone-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    user.role === 'ADMIN' ? "bg-purple-100 text-purple-600" : "bg-stone-100 text-stone-500"
                  )}>
                    {user.role}
                  </span>
                  <button 
                    onClick={() => toggleUserStatus(user)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      user.active ? "text-emerald-500 hover:bg-emerald-50" : "text-red-400 hover:bg-red-50"
                    )}
                  >
                    {user.active ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Mail className="text-stone-400" size={24} />
            Inviti Pendenti
          </h2>
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden divide-y divide-stone-100">
            {invitations.filter(i => !i.used).map((inv) => (
              <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div>
                  <h3 className="font-bold">{inv.email}</h3>
                  <p className="text-xs text-stone-400">Scade il {format(inv.expiresAt.toDate(), 'dd MMM yyyy', { locale: it })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-50 px-2 py-1 rounded">
                    {inv.role}
                  </span>
                  <div className="text-xs font-mono bg-stone-100 px-2 py-1 rounded text-stone-600">
                    {inv.token}
                  </div>
                </div>
              </div>
            ))}
            {invitations.filter(i => !i.used).length === 0 && (
              <div className="p-12 text-center text-stone-400">Nessun invito pendente.</div>
            )}
          </div>
        </section>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Invita Nuovo Utente">
        <form onSubmit={handleInvite} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Email Utente</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5"
              placeholder="esempio@azienda.it"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Ruolo</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setRole('MEMBER')}
                className={cn(
                  "flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                  role === 'MEMBER' ? "bg-black text-white border-black" : "bg-white text-stone-500 border-stone-200"
                )}
              >
                Membro
              </button>
              <button 
                type="button"
                onClick={() => setRole('ADMIN')}
                className={cn(
                  "flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all",
                  role === 'ADMIN' ? "bg-black text-white border-black" : "bg-white text-stone-500 border-stone-200"
                )}
              >
                Admin
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-2">
              Gli Admin possono gestire utenti, anagrafiche e creare task. I Membri possono solo vedere e completare i task assegnati.
            </p>
          </div>
          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg"
          >
            Crea Invito
          </button>
        </form>
      </Modal>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
