import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Contact, ContactType, Address, ContactInfo } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, MapPin, Phone, Mail, MoreVertical, Trash2, Edit2, Building2, User, Globe, Loader2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion } from 'framer-motion';
import { geocodeAddress, formatAddressForGeocoding } from '../services/geocodingService';
import { Map } from '../components/Map';

// General Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[ErrorBoundary] Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center">
          <h2 className="text-xl font-bold mb-4">Si è verificato un errore.</h2>
          <p className="text-stone-500 mb-6">{this.state.error?.message || "Errore sconosciuto"}</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="bg-black text-white px-6 py-2 rounded-xl"
          >
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <div className="h-[200px] w-full flex flex-col items-center justify-center bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
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

export default function Contacts() {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<ContactType>('CLIENT');
  const [notes, setNotes] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([{ id: '1', label: 'Sede Principale', street: '', city: '', zip: '', country: 'Italia' }]);
  const [contactInfos, setContactInfos] = useState<ContactInfo[]>([{ type: 'phone', value: '' }]);
  const [isGeocoding, setIsGeocoding] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact));
      setContacts(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'contacts'));

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setName('');
    setType('CLIENT');
    setNotes('');
    setAddresses([{ id: '1', label: 'Sede Principale', street: '', city: '', zip: '', country: 'Italia' }]);
    setContactInfos([{ type: 'phone', value: '' }]);
    setEditingContact(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const contactData = {
      name,
      type,
      notes,
      addresses: addresses.filter(a => a.street),
      contacts: contactInfos.filter(c => c.value),
      createdAt: editingContact ? editingContact.createdAt : Timestamp.now()
    };

    try {
      if (editingContact) {
        await updateDoc(doc(db, 'contacts', editingContact.id), contactData);
      } else {
        await addDoc(collection(db, 'contacts'), contactData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'contacts');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo contatto?')) {
      try {
        await deleteDoc(doc(db, 'contacts', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'contacts');
      }
    }
  };

  const handleGeocode = async (index: number) => {
    const addr = addresses[index];
    if (!addr.street || !addr.city) return;

    setIsGeocoding(addr.id);
    const addressString = formatAddressForGeocoding(addr);
    const result = await geocodeAddress(addressString);

    if (result) {
      const newAddr = [...addresses];
      newAddr[index].lat = result.lat;
      newAddr[index].lng = result.lng;
      setAddresses(newAddr);
    } else {
      alert('Impossibile trovare le coordinate per questo indirizzo.');
    }
    setIsGeocoding(null);
  };

  const openEdit = (contact: Contact) => {
    console.log(`[Contacts] Opening edit for ${contact.name}`);
    setEditingContact(contact);
    setName(contact.name);
    setType(contact.type);
    setNotes(contact.notes);
    setAddresses(contact.addresses.length > 0 ? contact.addresses : [{ id: '1', label: 'Sede Principale', street: '', city: '', zip: '', country: 'Italia' }]);
    setContactInfos(contact.contacts.length > 0 ? contact.contacts : [{ type: 'phone', value: '' }]);
    setIsModalOpen(true);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Anagrafiche</h1>
          <p className="text-stone-500">Gestisci i tuoi clienti e fornitori.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-black text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2 hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus size={20} />
            Nuovo Contatto
          </button>
        )}
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
        <input 
          type="text" 
          placeholder="Cerca per nome..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <motion.div 
            layout
            key={contact.id}
            className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-xl transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase",
                contact.type === 'CLIENT' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              )}>
                {contact.type === 'CLIENT' ? 'Cliente' : 'Fornitore'}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(contact)} className="p-2 text-stone-400 hover:text-black hover:bg-stone-100 rounded-full transition-all">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(contact.id)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Building2 className="text-stone-400" size={20} />
              {contact.name}
            </h3>

            <div className="space-y-3 mb-6">
              {contact.addresses.slice(0, 1).map((addr) => (
                <div key={addr.id} className="flex items-start gap-3 text-sm text-stone-600">
                  <MapPin className="text-stone-400 mt-0.5 shrink-0" size={16} />
                  <span>{addr.street}, {addr.city}</span>
                </div>
              ))}
              {contact.contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-stone-600">
                  {c.type === 'phone' ? <Phone className="text-stone-400 shrink-0" size={16} /> : <Mail className="text-stone-400 shrink-0" size={16} />}
                  <span>{c.value}</span>
                </div>
              ))}
            </div>

            {contact.notes && (
              <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-500 italic">
                {contact.notes}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingContact ? "Modifica Contatto" : "Nuovo Contatto"}
      >
        <ErrorBoundary>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">Ragione Sociale</label>
              <input 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">Tipo</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as ContactType)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="CLIENT">Cliente</option>
                <option value="SUPPLIER">Fornitore</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-stone-700">Indirizzi</label>
              <button 
                type="button"
                onClick={() => setAddresses([...addresses, { id: Date.now().toString(), label: '', street: '', city: '', zip: '', country: 'Italia' }])}
                className="text-xs font-bold text-stone-500 hover:text-black"
              >
                + Aggiungi Indirizzo
              </button>
            </div>
            {addresses.map((addr, index) => (
              <div key={addr.id} className="p-4 border border-stone-100 rounded-2xl bg-stone-50/50 space-y-3">
                <input 
                  placeholder="Etichetta (es. Sede, Magazzino)"
                  value={addr.label}
                  onChange={(e) => {
                    const newAddr = [...addresses];
                    newAddr[index].label = e.target.value;
                    setAddresses(newAddr);
                  }}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    placeholder="Via/Piazza"
                    value={addr.street}
                    onChange={(e) => {
                      const newAddr = [...addresses];
                      newAddr[index].street = e.target.value;
                      setAddresses(newAddr);
                    }}
                    className="col-span-2 bg-white border border-stone-200 rounded-lg p-2 text-sm"
                  />
                  <input 
                    placeholder="Città"
                    value={addr.city}
                    onChange={(e) => {
                      const newAddr = [...addresses];
                      newAddr[index].city = e.target.value;
                      setAddresses(newAddr);
                    }}
                    className="bg-white border border-stone-200 rounded-lg p-2 text-sm"
                  />
                  <input 
                    placeholder="CAP"
                    value={addr.zip}
                    onChange={(e) => {
                      const newAddr = [...addresses];
                      newAddr[index].zip = e.target.value;
                      setAddresses(newAddr);
                    }}
                    className="bg-white border border-stone-200 rounded-lg p-2 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
                    {addr.lat && addr.lng ? (
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Globe size={10} />
                        {addr.lat.toFixed(4)}, {addr.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Globe size={10} />
                        Coordinate non impostate
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isGeocoding === addr.id}
                    onClick={() => handleGeocode(index)}
                    className="text-xs font-bold text-black hover:text-stone-600 flex items-center gap-1 disabled:opacity-50"
                  >
                    {isGeocoding === addr.id ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                    Geolocalizza
                  </button>
                </div>
              </div>
            ))}
          </div>

          {addresses.some(a => a.lat && a.lng) && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700">Anteprima Posizione</label>
              <MapErrorBoundary>
                <Map 
                  points={addresses
                    .filter(a => a.lat && a.lng)
                    .map(a => ({
                      lat: a.lat!,
                      lng: a.lng!,
                      label: a.label || 'Indirizzo',
                      type: 'PICKUP' // Default color for preview
                    }))
                  }
                  className="h-[200px] w-full rounded-xl overflow-hidden border border-stone-200"
                />
              </MapErrorBoundary>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-stone-700">Contatti</label>
              <button 
                type="button"
                onClick={() => setContactInfos([...contactInfos, { type: 'phone', value: '' }])}
                className="text-xs font-bold text-stone-500 hover:text-black"
              >
                + Aggiungi Contatto
              </button>
            </div>
            {contactInfos.map((c, index) => (
              <div key={index} className="flex gap-2">
                <select 
                  value={c.type}
                  onChange={(e) => {
                    const newC = [...contactInfos];
                    newC[index].type = e.target.value as 'phone' | 'email';
                    setContactInfos(newC);
                  }}
                  className="bg-stone-50 border border-stone-200 rounded-xl p-2 text-sm"
                >
                  <option value="phone">Tel</option>
                  <option value="email">Email</option>
                </select>
                <input 
                  placeholder={c.type === 'phone' ? 'Numero' : 'Email'}
                  value={c.value}
                  onChange={(e) => {
                    const newC = [...contactInfos];
                    newC[index].value = e.target.value;
                    setContactInfos(newC);
                  }}
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-xl p-2 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Note</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[100px]"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all"
          >
            {editingContact ? "Salva Modifiche" : "Crea Contatto"}
          </button>
        </form>
      </ErrorBoundary>
    </Modal>
    </div>
  );
}

// Utility function for App.tsx
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
