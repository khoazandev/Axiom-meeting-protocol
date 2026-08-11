import { create } from 'zustand';

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('axiom_token') : null,
  activeOrganization:
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('axiom_organization') || 'null')
      : null,
  organizations: [],
  setAuth: (user, token, organizations, activeOrganization) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('axiom_token', token);
      if (activeOrganization) {
        localStorage.setItem('axiom_organization', JSON.stringify(activeOrganization));
      }
    }
    set({
      user,
      token,
      organizations,
      activeOrganization:
        activeOrganization || (organizations.length > 0 ? organizations[0] : null),
    });
  },
  setActiveOrganization: (organization) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('axiom_organization', JSON.stringify(organization));
    }
    set({ activeOrganization: organization });
  },
  setOrganizations: (organizations) => set({ organizations }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('axiom_token');
      localStorage.removeItem('axiom_organization');
    }
    set({ user: null, token: null, activeOrganization: null, organizations: [] });
  },
}));
