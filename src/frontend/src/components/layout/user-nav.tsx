'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { LogOut, Settings, User, Shield, Sparkles } from 'lucide-react';

export function UserNav() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const name = user?.full_name || 'Axiom User';
  const email = user?.email || 'user@axiom.ai';
  const initials = (name.split(' ').map((n) => n[0]).join('') || 'U').slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-9 w-9 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary focus-visible:outline-none">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user?.avatar_url || ''} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <User className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Profile & Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Preferences</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/admin')}>
            <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Admin Center</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
