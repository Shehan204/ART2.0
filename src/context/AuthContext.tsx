import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebase';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user doc
        let u = await firestoreService.getUser(firebaseUser.uid);
        if (u) {
           setUser(u);
        } else {
           // Fallback if not created properly
           setUser({ uid: firebaseUser.uid, username: firebaseUser.email || 'User', email: firebaseUser.email || '', role: 'user', points: 0 });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
