import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type AdminContextType = {
  adminKey: string;
  setAdminKey: (key: string) => void;
  clearAdminKey: () => void;
  isAdmin: boolean;
};

const AdminContext = createContext<AdminContextType>({
  adminKey: '',
  setAdminKey: () => {},
  clearAdminKey: () => {},
  isAdmin: false,
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminKey, setAdminKeyState] = useState(() => localStorage.getItem('ru_admin_key') ?? '');

  const setAdminKey = useCallback((key: string) => {
    localStorage.setItem('ru_admin_key', key);
    setAdminKeyState(key);
  }, []);

  const clearAdminKey = useCallback(() => {
    localStorage.removeItem('ru_admin_key');
    setAdminKeyState('');
  }, []);

  return (
    <AdminContext.Provider value={{ adminKey, setAdminKey, clearAdminKey, isAdmin: adminKey.length > 0 }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);
