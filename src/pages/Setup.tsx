import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { Invitation, UserProfile } from '../types';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function Setup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Token mancante.');
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'invitations'), where('token', '==', token), where('used', '==', false));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setError('Invito non valido o già utilizzato.');
        } else {
          const invData = snapshot.docs[0].data() as Invitation;
          setInvitation({ ...invData, id: snapshot.docs[0].id });
        }
      } catch (err) {
        setError('Errore durante la verifica del token.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSetup = async () => {
    if (!invitation) return;
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        setError(`Devi accedere con l'email invitata: ${invitation.email}. Attualmente sei collegato come ${user.email}.`);
        setLoading(false);
        return;
      }

      // Create profile
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'Utente',
        role: invitation.role,
        active: true,
        createdAt: Timestamp.now()
      };

      await setDoc(doc(db, 'users', user.uid), profile);
      await updateDoc(doc(db, 'invitations', invitation.id), { used: true });

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
      setError('Errore durante la creazione del profilo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight mb-6">Attivazione Account</h1>
        
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="animate-spin text-stone-400" size={40} />
            <p className="text-stone-500">Verifica in corso...</p>
          </div>
        ) : error ? (
          <div className="py-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <p className="text-red-600 font-medium mb-6">{error}</p>
            <button onClick={() => navigate('/login')} className="text-stone-400 underline text-sm">Torna al login</button>
          </div>
        ) : success ? (
          <div className="py-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-emerald-600 font-bold text-xl mb-2">Benvenuto!</p>
            <p className="text-stone-500">Il tuo account è stato attivato. Verrai reindirizzato...</p>
          </div>
        ) : (
          <div>
            <p className="text-stone-500 mb-8">
              Sei stato invitato come <span className="font-bold text-black">{invitation?.role}</span>.<br />
              Accedi con Google per completare la configurazione.
            </p>
            <button 
              onClick={handleSetup}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Completa Setup
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
