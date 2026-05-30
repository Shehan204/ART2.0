import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { User } from '../types';
import { firestoreService } from '../firebase/firestoreService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, username: string, isAdmin?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, loading: true, login: async () => {}, signup: async () => {}, logout: () => {} 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userDocUnsub: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear previous subscription if it exists
      if (userDocUnsub) {
        userDocUnsub();
        userDocUnsub = null;
      }
      
      if (firebaseUser) {
        // Subscribe to user doc
        userDocUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
             setUser(docSnap.data() as User);
          } else {
             // Fallback if not created properly
             setUser({ uid: firebaseUser.uid, username: firebaseUser.email || 'User', email: firebaseUser.email || '', role: 'user', points: 0 });
          }
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
       if (userDocUnsub) userDocUnsub();
       unsubscribeAuth();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (email: string, pass: string, username: string, isAdmin: boolean = false) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser: User = { uid: res.user.uid, username, email, role: isAdmin ? 'admin' : 'user', points: 0 };
    await firestoreService.saveUser(newUser);
    setUser(newUser);
  };

  const logout = () => {
    auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
