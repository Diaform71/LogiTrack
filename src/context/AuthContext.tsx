import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Listen to profile changes
        const profileRef = doc(db, 'users', user.uid);
        const unsubProfile = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ ...docSnap.data(), uid: docSnap.id } as UserProfile);
          } else {
            // Check if this is the owner email
            if (user.email === 'diaform@yahoo.com') {
              try {
                const newProfile: UserProfile = {
                  uid: user.uid,
                  email: user.email,
                  name: user.displayName || 'Admin',
                  role: 'ADMIN',
                  active: true,
                  createdAt: Timestamp.now()
                };
                await setDoc(profileRef, newProfile);
                setProfile(newProfile);
              } catch (err) {
                console.error("Error creating admin profile:", err);
                setProfile(null);
              }
            } else {
              setProfile(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile fetch error:", error);
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isAdmin = profile?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
