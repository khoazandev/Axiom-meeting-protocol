'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  Video,
  CheckSquare,
  Calendar,
  BookOpen,
  Settings,
  ShieldCheck,
  Building,
  Plus,
  ChevronsUpDown,
  LogOut,
  Sparkles,
  Kanban,
  LayoutGrid,
  ListTodo,
  Clock,
  FileText,
  GitBranch,
} from 'lucide-react';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeOrganization, organizations, setActiveOrganization, logout } = useAuthStore();
  const { isMobile, state } = useSidebar();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navWorkspace = [
    { title: 'Meetings Hub', url: '/meetings', icon: Video, badge: null },
    { title: 'Tasks & Actions', url: '/tasks', icon: CheckSquare, badge: 'AI' },
    { title: 'Calendar', url: '/calendar', icon: Calendar, badge: null },
    { title: 'Knowledge Base', url: '/knowledge', icon: BookOpen, badge: 'RAG' },
  ];

  const navJira = [
    { title: 'Jira Projects', url: '/jira', icon: Kanban, badge: null },
    { title: 'Project Board', url: '/jira/SMA/board', icon: LayoutGrid, badge: null },
    { title: 'Backlog & Sprints', url: '/jira/SMA/backlog', icon: ListTodo, badge: null },
    { title: 'Roadmap & Timeline', url: '/jira/SMA/timeline', icon: Clock, badge: null },
    { title: 'Docs & Specs', url: '/jira/SMA/docs', icon: FileText, badge: null },
    { title: 'Development', url: '/jira/SMA/development', icon: GitBranch, badge: null },
  ];

  const navSystem = [
    { title: 'Admin Center', url: '/admin', icon: ShieldCheck, badge: 'Gov' },
    { title: 'Settings', url: '/settings', icon: Settings, badge: null },
  ];

  const userName = user?.full_name || 'Axiom Member';
  const userEmail = user?.email || 'member@axiom.ai';
  const userInitials = (
    userName
      .split(' ')
      .map((n) => n[0])
      .join('') || 'A'
  )
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* ─── Header: Workspace Switcher ────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                    <Building className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeOrganization?.name || 'Axiom Workspace'}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      Enterprise Plan
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side={isMobile ? 'bottom' : 'right'}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Workspaces
                </DropdownMenuLabel>
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => setActiveOrganization(org)}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border bg-background text-xs font-semibold">
                      {org.name[0]?.toUpperCase() || 'W'}
                    </div>
                    {org.name}
                  </DropdownMenuItem>
                ))}
                {organizations.length === 0 && (
                  <DropdownMenuItem className="gap-2 p-2 text-muted-foreground">
                    Default Workspace
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push('/admin')}
                  className="gap-2 p-2 cursor-pointer"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">Add workspace</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ─── Content: Navigation Groups ────────────────────────── */}
      <SidebarContent>
        {/* Workspace Hub */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navWorkspace.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== '/meetings' && pathname.startsWith(item.url));
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="bg-primary/10 text-primary border border-primary/20">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Jira Suite */}
        <SidebarGroup>
          <SidebarGroupLabel>Jira Integration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navJira.map((item) => {
                const isActive =
                  pathname === item.url || (item.url === '/jira' && pathname === '/jira');
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System & Governance */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSystem.map((item) => {
                const isActive = pathname.startsWith(item.url);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ─── Footer: User Account & Logout ─────────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.avatar_url || ''} alt={userName} />
                    <AvatarFallback className="rounded-lg bg-primary/20 text-primary font-bold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">{userEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.avatar_url || ''} alt={userName} />
                      <AvatarFallback className="rounded-lg bg-primary/20 text-primary font-bold text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push('/settings')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Administration
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
