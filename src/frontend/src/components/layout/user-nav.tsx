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
import { LogOut, Settings, User, Shield, Sparkles, UserCircle, Users } from 'lucide-react';
import { UserProfileModal, generateInitialsAvatar } from '@/components/profile/UserProfileModal';

export function UserNav() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const name = user?.full_name || 'Axiom User';
  const email = user?.email || 'user@axiom.ai';
  const role = user?.role || 'MEMBER';
  const isOwner = email === 'admin@axiom.com' || role === 'OWNER';
  const isManager = email === 'manager.khoa@axiom.com' || role === 'ADMIN';
  const isMember = !isOwner && !isManager;

  const initials = (
    name
      .split(' ')
      .map((n) => n[0])
      .join('') || 'U'
  )
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative h-9 w-9 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary focus-visible:outline-none cursor-pointer">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={user?.avatar_url || generateInitialsAvatar(name)} alt={name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{name}</p>
              <p className="text-xs leading-none text-muted-foreground">{email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                {isOwner ? 'CHỦ TỊCH / OWNER' : isManager ? 'TRƯỞNG PHÒNG / MANAGER' : 'THÀNH VIÊN / MEMBER'}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
              <UserCircle className="mr-2 h-4 w-4 text-blue-500" />
              <span className="font-medium">Hồ Sơ & Đổi Avatar</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Cài Đặt Hệ Thống</span>
            </DropdownMenuItem>

            {isOwner && (
              <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4 text-amber-500" />
                <span className="font-medium text-amber-600 dark:text-amber-400">Admin Center (Chủ tịch)</span>
              </DropdownMenuItem>
            )}
            {isManager && (
              <DropdownMenuItem onClick={() => router.push('/manager')} className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-600 dark:text-blue-400">Bàn Làm Việc Manager</span>
              </DropdownMenuItem>
            )}
            {isMember && (
              <DropdownMenuItem onClick={() => router.push('/member')} className="cursor-pointer">
                <Users className="mr-2 h-4 w-4 text-emerald-500" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Bàn Làm Việc Member</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:bg-destructive/10 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Đăng xuất</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Profile & Avatar Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
