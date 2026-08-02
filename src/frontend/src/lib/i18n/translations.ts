export type Language = 'vi' | 'en';

export const translations = {
  vi: {
    nav: {
      meetings: 'Cuộc họp',
      tasks: 'Công việc & Action Items',
      calendar: 'Lịch làm việc',
      knowledge: 'Kho tri thức AI',
      admin: 'Quản trị Admin',
      settings: 'Cài đặt hệ thống',
      newMeeting: 'Tạo cuộc họp mới',
    },
    header: {
      searchPlaceholder: 'Tìm kiếm cuộc họp, biên bản MoM hoặc tài liệu...',
      activeWorkspace: 'Workspace hiện tại',
    },
    meetings: {
      title: 'Danh sách cuộc họp',
      subTitle: 'Quản lý lịch họp, phụ đề trực tiếp thời gian thực và biên bản họp tự động (MoM).',
      createBtn: 'Tạo cuộc họp mới',
      joinBtn: 'Tham gia cuộc họp',
    },
    common: {
      save: 'Lưu thay đổi',
      cancel: 'Hủy bỏ',
      delete: 'Xóa',
      status: 'Trạng thái',
    },
  },
  en: {
    nav: {
      meetings: 'Meetings',
      tasks: 'Tasks & Actions',
      calendar: 'Calendar',
      knowledge: 'Knowledge Hub',
      admin: 'Admin Console',
      settings: 'Settings',
      newMeeting: 'New Meeting',
    },
    header: {
      searchPlaceholder: 'Search meetings, MoM summaries, or docs...',
      activeWorkspace: 'Active Workspace',
    },
    meetings: {
      title: 'Meetings Directory',
      subTitle: 'Manage call schedules, live realtime subtitles, and automated MoM minutes.',
      createBtn: 'New Meeting',
      joinBtn: 'Join Meeting',
    },
    common: {
      save: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete',
      status: 'Status',
    },
  },
};
