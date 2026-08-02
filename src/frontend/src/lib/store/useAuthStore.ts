import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  provider: string;
  is_active: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  owner_id: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setAuth: (user: User, token: string, workspaces: Workspace[], activeWorkspace?: Workspace) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('axiom_token') : null,
  activeWorkspace: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('axiom_workspace') || 'null') : null,
  workspaces: [],
  setAuth: (user, token, workspaces, activeWorkspace) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('axiom_token', token);
      if (activeWorkspace) {
        localStorage.setItem('axiom_workspace', JSON.stringify(activeWorkspace));
      }
    }
    set({
      user,
      token,
      workspaces,
      activeWorkspace: activeWorkspace || (workspaces.length > 0 ? workspaces[0] : null),
    });
  },
  setActiveWorkspace: (workspace) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('axiom_workspace', JSON.stringify(workspace));
    }
    set({ activeWorkspace: workspace });
  },
  setWorkspaces: (workspaces) => set({ workspaces }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('axiom_token');
      localStorage.removeItem('axiom_workspace');
    }
    set({ user: null, token: null, activeWorkspace: null, workspaces: [] });
  },
}));
