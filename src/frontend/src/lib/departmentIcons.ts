export interface DepartmentIconOption {
  icon: string;
  label: string;
}

export const DEPARTMENT_ICONS: DepartmentIconOption[] = [
  { icon: 'code', label: 'Kỹ thuật' },
  { icon: 'terminal', label: 'Hệ thống' },
  { icon: 'palette', label: 'Thiết kế' },
  { icon: 'category', label: 'Sản phẩm' },
  { icon: 'trending_up', label: 'Kinh doanh' },
  { icon: 'campaign', label: 'Marketing' },
  { icon: 'precision_manufacturing', label: 'Vận hành' },
  { icon: 'hub', label: 'Hạ tầng' },
  { icon: 'payments', label: 'Tài chính' },
  { icon: 'account_balance', label: 'Kế toán' },
  { icon: 'groups', label: 'Nhân sự' },
  { icon: 'shield', label: 'Bảo mật' },
];

export function getDepartmentIcon(dept: { name?: string; description?: string | null }): string {
  if (dept.description) {
    const match = dept.description.match(/\[icon:([a-z_]+)\]/i);
    if (match && match[1]) return match[1];
  }
  const name = (dept.name || '').toLowerCase();
  if (name.includes('kỹ thuật') || name.includes('eng') || name.includes('tech') || name.includes('công nghệ')) {
    return 'code';
  }
  if (name.includes('sản phẩm') || name.includes('prod') || name.includes('thiết kế') || name.includes('design')) {
    return 'palette';
  }
  if (name.includes('kinh doanh') || name.includes('biz') || name.includes('tiếp thị') || name.includes('marketing') || name.includes('sales')) {
    return 'trending_up';
  }
  if (name.includes('vận hành') || name.includes('ops') || name.includes('khách hàng')) {
    return 'precision_manufacturing';
  }
  if (name.includes('tài chính') || name.includes('fin') || name.includes('kế toán')) {
    return 'payments';
  }
  if (name.includes('nhân sự') || name.includes('hr')) {
    return 'groups';
  }
  if (name.includes('bảo mật') || name.includes('security') || name.includes('pháp chế')) {
    return 'shield';
  }
  return 'domain';
}

export function getCleanDeptDescription(description?: string | null): string {
  if (!description) return '';
  return description.replace(/\[icon:[a-z_]+\]\s*/i, '').trim();
}

export function formatDeptDescriptionWithIcon(icon: string, description: string): string {
  const clean = getCleanDeptDescription(description);
  return `[icon:${icon}] ${clean}`.trim();
}
