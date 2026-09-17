export interface DepartmentIconOption {
  icon: string;
  label: string;
  domain: string;
}

export const DEPARTMENT_ICONS: DepartmentIconOption[] = [
  { icon: 'code', label: 'Kỹ thuật', domain: 'Phần mềm & Công nghệ' },
  { icon: 'palette', label: 'Thiết kế', domain: 'Sản phẩm & UI/UX' },
  { icon: 'trending_up', label: 'Kinh doanh', domain: 'Bán hàng & Doanh thu' },
  { icon: 'campaign', label: 'Marketing', domain: 'Tiếp thị & Truyền thông' },
  { icon: 'precision_manufacturing', label: 'Vận hành', domain: 'Quy trình & Vận hành' },
  { icon: 'account_balance', label: 'Tài chính', domain: 'Kế toán & Tài chính' },
  { icon: 'groups', label: 'Nhân sự', domain: 'Tổ chức & Nhân sự' },
  { icon: 'headset_mic', label: 'Hỗ trợ CSKH', domain: 'Chăm sóc khách hàng' },
  { icon: 'shield', label: 'Bảo mật', domain: 'An ninh & Tuân thủ' },
  { icon: 'gavel', label: 'Pháp chế', domain: 'Pháp lý & Hợp đồng' },
  { icon: 'terminal', label: 'DevOps', domain: 'Hạ tầng & Hệ thống' },
  { icon: 'lightbulb', label: 'Chiến lược', domain: 'Nghiên cứu & Đổi mới' },
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
    return 'account_balance';
  }
  if (name.includes('nhân sự') || name.includes('hr')) {
    return 'groups';
  }
  if (name.includes('bảo mật') || name.includes('security')) {
    return 'shield';
  }
  if (name.includes('pháp chế') || name.includes('legal')) {
    return 'gavel';
  }
  if (name.includes('hạ tầng') || name.includes('devops')) {
    return 'terminal';
  }
  if (name.includes('chiến lược') || name.includes('r&d')) {
    return 'lightbulb';
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

/**
 * Returns a map of iconName -> departmentName for all currently taken icons,
 * excluding the department specified by `excludeDeptId` (useful when editing).
 */
export function getUsedDepartmentIcons(
  departments: Array<{ id: string; name?: string; description?: string | null }>,
  excludeDeptId?: string
): Record<string, string> {
  const usedMap: Record<string, string> = {};
  for (const dept of departments) {
    if (excludeDeptId && dept.id === excludeDeptId) {
      continue;
    }
    const icon = getDepartmentIcon(dept);
    if (icon && icon !== 'domain') {
      usedMap[icon] = dept.name || 'Phòng ban khác';
    }
  }
  return usedMap;
}

/**
 * Returns the first icon from DEPARTMENT_ICONS that is not yet taken by any department.
 */
export function getFirstAvailableIcon(
  departments: Array<{ id: string; name?: string; description?: string | null }>,
  excludeDeptId?: string
): string {
  const usedMap = getUsedDepartmentIcons(departments, excludeDeptId);
  const available = DEPARTMENT_ICONS.find((opt) => !usedMap[opt.icon]);
  return available ? available.icon : 'code';
}
