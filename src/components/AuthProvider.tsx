import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const roleDoc = await getDoc(doc(db, 'userRoles', u.uid));
        if (roleDoc.exists()) {
          setRole(roleDoc.data() as UserRole);
        } else {
          // Check for bootstrap admin email
          const bootstrapAdmins = ['safderjamali12@gmail.com', 'safdarse063@gmail.com'];
          const isBootstrapAdmin = u.email && bootstrapAdmins.includes(u.email);
          const defaultRole: UserRole = {
            uid: u.uid,
            email: u.email || '',
            role: isBootstrapAdmin ? 'ADMIN' : 'CLERK'
          };
          setRole(defaultRole);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
