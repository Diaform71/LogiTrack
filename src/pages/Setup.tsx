import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Token mancante.');
        setLoading(false);
        return;
      }

      try {
        console.log('Verifica token:', token);
        const q = query(collection(db, 'invitations'), where('token', '==', token));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          console.log('Token non trovato');
          setError('Invito non valido.');
        } else {
          const invData = snapshot.docs[0].data() as Invitation;
          console.log('Invito trovato:', invData);
          if (invData.used) {
            setError('Questo invito è già stato utilizzato.');
          } else if (invData.expiresAt.toDate() < new Date()) {
            setError('Questo invito è scaduto.');
          } else {
            console.log('Email attesa:', invData.email);
            setInvitation({ ...invData, id: snapshot.docs[0].id });
          }
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
    setError(null);

    try {
      // Sign out first to ensure a fresh Google login and avoid session conflicts
      await auth.signOut();
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      const tokenResult = await user.getIdTokenResult();
      
      // Get email from multiple possible sources
      const userEmail = user.email || 
                        (additionalInfo?.profile as any)?.email || 
                        (tokenResult.claims.email as string) ||
                        (user.providerData && user.providerData[0]?.email);
      
      const debug = { 
        uid: user.uid, 
        email: user.email,
        tokenEmail: tokenResult.claims.email,
        profileEmail: (additionalInfo?.profile as any)?.email,
        providerData: user.providerData,
        finalDetectedEmail: userEmail,
        isIframe: window.self !== window.top
      };
      setDebugInfo(debug);
      console.log('Setup - User signed in:', debug);

      const targetEmail = (invitation.email || '').toLowerCase().trim();
      const currentEmail = (userEmail || '').toLowerCase().trim();

      if (!currentEmail || currentEmail !== targetEmail) {
        let msg = `Devi accedere con l'email invitata: ${targetEmail}. Attualmente sei collegato come ${currentEmail || 'nessuna email trovata (null)'}.`;
        if (!currentEmail && isIframe) {
          msg += " Nota: Essendo all'interno di un'anteprima (iframe), il browser potrebbe bloccare l'accesso all'email. Prova ad aprire l'app in una nuova scheda.";
        }
        setError(msg);
        setLoading(false);
        return;
      }

      // Create profile
      const profile: UserProfile = {
        uid: user.uid,
        email: userEmail,
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
            
            {isIframe && !debugInfo?.finalDetectedEmail && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm text-left">
                <p className="font-bold mb-1">⚠️ Problema di Privacy del Browser</p>
                <p>L'anteprima potrebbe bloccare i dati di Google. Clicca sul pulsante in alto a destra (freccia fuori dal quadrato) per aprire l'app in una nuova scheda e riprova.</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setError(null);
                  handleSetup();
                }} 
                className="bg-black text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-all"
              >
                Riprova con un altro account
              </button>
              <button onClick={() => navigate('/login')} className="text-stone-400 underline text-sm">Torna al login</button>
            </div>
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
