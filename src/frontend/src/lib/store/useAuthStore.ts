import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  provider: string;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  activeOrganization: Organization | null;
  organizations: Organization[];
  setAuth: (
    user: User,
    token: string,
    organizations: Organization[],
    activeOrganization?: Organization
  ) => void;
  setActiveOrganization: (organization: Organization) => void;
  setOrganizations: (organizations: Organization[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      activeOrganization: null,
      organizations: [],
      setAuth: (user, token, organizations, activeOrganization) => {
        set({
          user,
          token,
          organizations,
          activeOrganization:
            activeOrganization || (organizations.length > 0 ? organizations[0] : null),
        });
      },
      setActiveOrganization: (organization) => {
        set({ activeOrganization: organization });
      },
      setOrganizations: (organizations) => set({ organizations }),
      logout: () => {
        set({ user: null, token: null, activeOrganization: null, organizations: [] });
      },
    }),
    {
      name: 'axiom-auth-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage),
    }
  )
);
