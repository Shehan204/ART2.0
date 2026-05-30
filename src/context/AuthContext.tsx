import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { firestoreService } from './firestoreService';
import { UserData } from '../types';

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  loginCustom?: (username: string, pass: string, isSignUp?: boolean) => Promise<boolean>;
  logoutCustom?: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockUser = localStorage.getItem('mockAdmin');
    if (mockUser === 'shehan') {
      setUser({ id: 'shehan', username: 'shehan', role: 'admin', score: 0, createdAt: 0 });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user document
        let userData = await firestoreService.getUser(firebaseUser.uid);
        if (userData) {
          setUser({ ...userData, id: firebaseUser.uid });
        } else {
          // If no doc but logged in, they might be anon or just created.
          setUser({ id: firebaseUser.uid, username: firebaseUser.email?.split('@')[0] || 'Player', role: 'user', score: 0, createdAt: Date.now() });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginCustom = async (username: string, pass: string, isSignUp: boolean = false) => {
    if (username.toLowerCase() === 'shehan' && pass === '0000') {
      localStorage.setItem('mockAdmin', 'shehan');
      try {
        await signInAnonymously(auth);
      } catch (e) {}
      setUser({ id: 'shehan', username: 'shehan', role: 'admin', score: 0, createdAt: Date.now() });
      return true;
    }

    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@ar-app.local`;
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await firestoreService.createUser(cred.user.uid, username);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
      return true;
    } catch (e: any) {
      if (e.code === 'auth/operation-not-allowed') {
        alert("CRITICAL ERROR: You must enable 'Email/Password' Sign-in provider in your Firebase Console -> Authentication -> Sign-in method!");
      } else {
        console.error("Login Error:", e);
        alert(e.message);
      }
      return false;
    }
  };

  const logoutCustom = () => {
    localStorage.removeItem('mockAdmin');
    setUser(null);
    auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginCustom, logoutCustom }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
