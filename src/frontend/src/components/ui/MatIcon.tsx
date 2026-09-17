'use client';

import React from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Users,
  User,
  UserPlus,
  UserCheck,
  Network,
  Building2,
  Building,
  Gavel,
  Scale,
  Lock,
  History,
  Webhook,
  Workflow,
  Terminal,
  Code2,
  Zap,
  Play,
  CheckCircle,
  CheckCircle2,
  Clock,
  Bot,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Search,
  Download,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Copy,
  Headphones,
  Mic,
  Gauge,
  CheckSquare,
  Brain,
  TrendingUp,
  BadgeCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  HeartPulse,
  Server,
  LayoutDashboard,
  Video,
  VideoOff,
  BookOpen,
  Check,
  Sliders,
  FileText,
  Palette,
  Megaphone,
  Cpu,
  Wrench,
  Settings,
  Landmark,
  Lightbulb,
  Pencil,
  RotateCw,
  Eye,
  EyeOff,
  GripVertical,
  Crown,
  Database,
  PieChart,
  Calendar,
  ClipboardList,
  LayoutGrid,
  BellRing,
  BellDot,
  Filter,
  Layers,
  Phone,
  Wifi,
  LucideProps,
} from 'lucide-react';

export interface MatIconProps extends Omit<LucideProps, 'ref'> {
  name: string;
  size?: number | string;
  filled?: boolean;
  className?: string;
}

/**
 * Universal SVG Icon Component using Lucide React
 * 100% reliable, zero network dependency, crisp vector rendering at any scale.
 * Completely eliminates raw text ligature bugs and unmapped icons.
 */
export function MatIcon({
  name,
  size = 20,
  filled = false,
  className = '',
  color,
  ...props
}: MatIconProps) {
  const numSize = typeof size === 'number' ? size : parseInt(size) || 20;

  // Icon mapping table from Material names to Lucide SVG components
  switch (name) {
    // Brand & Security
    case 'shield_person':
    case 'admin_panel_settings':
    case 'security':
      return <ShieldCheck size={numSize} className={className} color={color} {...props} />;
    case 'shield':
      return <Shield size={numSize} className={className} color={color} {...props} />;
    case 'lock':
    case 'lock_clock':
      return <Lock size={numSize} className={className} color={color} {...props} />;
    case 'add_moderator':
      return <ShieldAlert size={numSize} className={className} color={color} {...props} />;

    // Radar & Live Meeting & Audio
    case 'radar':
    case 'sensors':
    case 'graphic_eq':
      return <Radio size={numSize} className={className} color={color} {...props} />;
    case 'headset_mic':
    case 'headphones':
      return <Headphones size={numSize} className={className} color={color} {...props} />;
    case 'record_voice_over':
    case 'mic':
      return <Mic size={numSize} className={className} color={color} {...props} />;
    case 'video_camera_front':
    case 'video_call':
    case 'videocam':
      return <Video size={numSize} className={className} color={color} {...props} />;
    case 'videocam_off':
      return <VideoOff size={numSize} className={className} color={color} {...props} />;

    // Users & RBAC
    case 'manage_accounts':
    case 'groups':
    case 'group':
      return <Users size={numSize} className={className} color={color} {...props} />;
    case 'person':
      return <User size={numSize} className={className} color={color} {...props} />;
    case 'person_add':
    case 'group_add':
      return <UserPlus size={numSize} className={className} color={color} {...props} />;
    case 'supervised_user_circle':
      return <UserCheck size={numSize} className={className} color={color} {...props} />;

    // Organization & Department Specializations
    case 'account_tree':
    case 'hub':
      return <Network size={numSize} className={className} color={color} {...props} />;
    case 'corporate_fare':
    case 'business':
    case 'domain':
      return <Building2 size={numSize} className={className} color={color} {...props} />;
    case 'domain_add':
      return <Building size={numSize} className={className} color={color} {...props} />;
    case 'palette':
      return <Palette size={numSize} className={className} color={color} {...props} />;
    case 'campaign':
      return <Megaphone size={numSize} className={className} color={color} {...props} />;
    case 'precision_manufacturing':
      return <Cpu size={numSize} className={className} color={color} {...props} />;
    case 'account_balance':
      return <Landmark size={numSize} className={className} color={color} {...props} />;
    case 'lightbulb':
      return <Lightbulb size={numSize} className={className} color={color} {...props} />;
    case 'workspace_premium':
      return <Crown size={numSize} className={className} color={color} {...props} />;

    // Policies & Discipline
    case 'gavel':
      return <Gavel size={numSize} className={className} color={color} {...props} />;
    case 'policy':
      return <Scale size={numSize} className={className} color={color} {...props} />;
    case 'tune':
    case 'sliders':
      return <Sliders size={numSize} className={className} color={color} {...props} />;

    // AI & MoM
    case 'auto_awesome':
      return <Sparkles size={numSize} className={className} color={color} {...props} />;
    case 'smart_toy':
      return <Bot size={numSize} className={className} color={color} {...props} />;
    case 'psychology':
      return <Brain size={numSize} className={className} color={color} {...props} />;

    // Tasks, Calendar & Charts
    case 'fact_check':
    case 'task_alt':
      return <CheckSquare size={numSize} className={className} color={color} {...props} />;
    case 'timer':
    case 'schedule':
      return <Clock size={numSize} className={className} color={color} {...props} />;
    case 'speed':
      return <Gauge size={numSize} className={className} color={color} {...props} />;
    case 'trending_up':
      return <TrendingUp size={numSize} className={className} color={color} {...props} />;
    case 'calendar_view_week':
    case 'calendar_today':
    case 'event':
      return <Calendar size={numSize} className={className} color={color} {...props} />;
    case 'assignment':
      return <ClipboardList size={numSize} className={className} color={color} {...props} />;
    case 'grid_view':
      return <LayoutGrid size={numSize} className={className} color={color} {...props} />;
    case 'dataset':
      return <Database size={numSize} className={className} color={color} {...props} />;
    case 'pie_chart':
      return <PieChart size={numSize} className={className} color={color} {...props} />;

    // Webhooks & API & Code
    case 'webhook':
      return <Webhook size={numSize} className={className} color={color} {...props} />;
    case 'api':
      return <Workflow size={numSize} className={className} color={color} {...props} />;
    case 'terminal':
      return <Terminal size={numSize} className={className} color={color} {...props} />;
    case 'code':
      return <Code2 size={numSize} className={className} color={color} {...props} />;
    case 'bolt':
      return <Zap size={numSize} className={className} color={color} {...props} />;
    case 'play_arrow':
      return <Play size={numSize} className={className} color={color} {...props} />;

    // General Actions & Feedback
    case 'check':
      return <Check size={numSize} className={className} color={color} {...props} />;
    case 'check_circle':
      return <CheckCircle2 size={numSize} className={className} color={color} {...props} />;
    case 'verified':
    case 'verified_user':
      return <BadgeCheck size={numSize} className={className} color={color} {...props} />;
    case 'search':
      return <Search size={numSize} className={className} color={color} {...props} />;
    case 'download':
      return <Download size={numSize} className={className} color={color} {...props} />;
    case 'arrow_back':
      return <ArrowLeft size={numSize} className={className} color={color} {...props} />;
    case 'arrow_forward':
      return <ArrowRight size={numSize} className={className} color={color} {...props} />;
    case 'add':
    case 'plus':
      return <Plus size={numSize} className={className} color={color} {...props} />;
    case 'close':
      return <X size={numSize} className={className} color={color} {...props} />;
    case 'content_copy':
      return <Copy size={numSize} className={className} color={color} {...props} />;
    case 'warning':
      return <AlertTriangle size={numSize} className={className} color={color} {...props} />;
    case 'error':
      return <AlertCircle size={numSize} className={className} color={color} {...props} />;
    case 'info':
      return <Info size={numSize} className={className} color={color} {...props} />;
    case 'delete':
      return <Trash2 size={numSize} className={className} color={color} {...props} />;
    case 'edit':
      return <Pencil size={numSize} className={className} color={color} {...props} />;
    case 'dns':
      return <Server size={numSize} className={className} color={color} {...props} />;
    case 'health_and_safety':
      return <HeartPulse size={numSize} className={className} color={color} {...props} />;
    case 'expand_more':
    case 'chevron_down':
    case 'arrow_drop_down':
    case 'keyboard_arrow_down':
      return <ChevronDown size={numSize} className={className} color={color} {...props} />;
    case 'chevron_right':
      return <ChevronRight size={numSize} className={className} color={color} {...props} />;
    case 'chevron_left':
      return <ChevronLeft size={numSize} className={className} color={color} {...props} />;
    case 'refresh':
    case 'sync':
      return <RotateCw size={numSize} className={className} color={color} {...props} />;
    case 'visibility':
      return <Eye size={numSize} className={className} color={color} {...props} />;
    case 'visibility_off':
      return <EyeOff size={numSize} className={className} color={color} {...props} />;
    case 'drag_indicator':
      return <GripVertical size={numSize} className={className} color={color} {...props} />;
    case 'notifications_active':
      return <BellRing size={numSize} className={className} color={color} {...props} />;
    case 'notification_important':
      return <BellDot size={numSize} className={className} color={color} {...props} />;
    case 'phone':
      return <Phone size={numSize} className={className} color={color} {...props} />;
    case 'wifi_tethering':
    case 'wifi':
      return <Wifi size={numSize} className={className} color={color} {...props} />;
    case 'filter_list':
      return <Filter size={numSize} className={className} color={color} {...props} />;
    case 'category':
      return <Layers size={numSize} className={className} color={color} {...props} />;
    case 'dashboard':
      return <LayoutDashboard size={numSize} className={className} color={color} {...props} />;
    case 'menu_book':
      return <BookOpen size={numSize} className={className} color={color} {...props} />;
    case 'logout':
      return <LogOut size={numSize} className={className} color={color} {...props} />;
    case 'description':
      return <FileText size={numSize} className={className} color={color} {...props} />;

    default:
      return <Sparkles size={numSize} className={className} color={color} {...props} />;
  }
}

export const MaterialIcon = MatIcon;
export default MatIcon;
