import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role?: string | null;
  phone?: string | null;
  job_title?: string | null;
  provider: string;
  is_active: boolean;
  department_id?: string | null;
  department_name?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  logo_url?: string | null;
  banner_url?: string | null;
  tagline?: string | null;
  tax_id?: string | null;
  industry?: string | null;
  website?: string | null;
  size?: string | null;
  description?: string | null;
  headquarters?: string | null;
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
    activeOrganization?: Organization | null
  ) => void;
  setActiveOrganization: (organization: Organization) => void;
  updateOrganization: (partialOrg: Partial<Organization>) => void;
  setOrganizations: (organizations: Organization[]) => void;
  updateUser: (partialUser: Partial<User>) => void;
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
      updateOrganization: (partialOrg) => {
        set((state) => {
          if (!state.activeOrganization) return {};
          const updated = { ...state.activeOrganization, ...partialOrg };
          const updatedList = state.organizations.map((org) =>
            org.id === updated.id ? updated : org
          );
          return { activeOrganization: updated, organizations: updatedList };
        });
      },
      setOrganizations: (organizations) => set({ organizations }),
      updateUser: (partialUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null,
        }));
      },
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
