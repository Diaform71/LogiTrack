import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, X } from 'lucide-react';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Task[]>([]);

  useEffect(() => {
    // Listen for tasks completed in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const q = query(
      collection(db, 'tasks'),
      where('status', '==', 'COMPLETED'),
      where('completedAt', '>=', Timestamp.fromDate(fiveMinutesAgo)),
      orderBy('completedAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const completedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      // Only show new ones (simple logic for demo)
      setNotifications(completedTasks);
    });

    return () => unsubscribe();
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] space-y-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="bg-white border border-stone-200 p-4 rounded-2xl shadow-2xl w-80 pointer-events-auto flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-stone-900 leading-tight">Task Completato</p>
              <p className="text-xs text-stone-500 truncate">{task.contactName}: {task.type}</p>
              <p className="text-[10px] text-stone-400 mt-1">Completato da {task.assignedName || 'un utente'}</p>
            </div>
            <button onClick={() => removeNotification(task.id)} className="text-stone-300 hover:text-stone-600">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
