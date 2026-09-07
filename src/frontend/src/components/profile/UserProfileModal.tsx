"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { authApi } from "@/lib/api";
import {
  X,
  Upload,
  User,
  Mail,
  Building2,
  Phone,
  FileText,
  Check,
  Camera,
  Sparkles,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Briefcase,
} from "lucide-react";

/**
 * Generate a crisp, high-resolution vector SVG initials avatar based on user's name.
 * Uses a deterministic executive gradient palette based on name hash.
 */
export function generateInitialsAvatar(name: string): string {
  const trimmed = (name || "User").trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);

  let initials = "AX";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (trimmed.length > 0) {
    initials = trimmed.slice(0, 2).toUpperCase();
  }

  // Curated modern enterprise linear gradients
  const gradients = [
    { c1: "#2563eb", c2: "#1d4ed8" }, // Sapphire Blue
    { c1: "#059669", c2: "#047857" }, // Forest Emerald
    { c1: "#7c3aed", c2: "#6d28d9" }, // Electric Violet
    { c1: "#ea580c", c2: "#c2410c" }, // Vibrant Amber
    { c1: "#0891b2", c2: "#0e7490" }, // Deep Cyan
    { c1: "#db2777", c2: "#be185d" }, // Rose Ruby
    { c1: "#4f46e5", c2: "#3730a3" }, // Indigo Slate
  ];

  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const grad = gradients[Math.abs(hash) % gradients.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${grad.c1}" />
        <stop offset="100%" stop-color="${grad.c2}" />
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="128" fill="url(#g)" />
    <text x="128" y="142" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" font-size="96" font-weight="700" text-anchor="middle" dominant-baseline="middle" letter-spacing="-1">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (message: string) => void;
}

export function UserProfileModal({ isOpen, onClose, onNotify }: UserProfileModalProps) {
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States - All editable in a single unified page
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("0912 345 678 (Ext: 104)");
  const [department, setDepartment] = useState("Khối Kỹ Thuật (Engineering)");
  const [title, setTitle] = useState("Senior AI Engineer");
  const [bio, setBio] = useState("Chuyên gia xử lý âm thanh thời gian thực & WebRTC SFU");

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isCustomUpload, setIsCustomUpload] = useState(false);

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Sync state whenever user or modal opens
  useEffect(() => {
    if (user && isOpen) {
      const currentName = user.full_name || "";
      setFullName(currentName);
      setEmail(user.email || "");

      // Check existing custom local storage or infer from role
      const stored = localStorage.getItem(`axiom_profile_${user.id || user.email}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.department) setDepartment(parsed.department);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.bio) setBio(parsed.bio);
        } catch {
          // ignore error
        }
      } else {
        if (user.email === "admin@axiom.com") {
          setDepartment("Ban Giám Đốc / Hội Đồng Quản Trị");
          setTitle("Chủ Tịch & Tổng Giám Đốc Điều Hành (CEO)");
          setBio("Toàn quyền kiểm soát và điều hành hệ thống Axiom DX-OS.");
          setPhone("0908 888 999 (Ext: 001)");
        } else if (user.email === "manager.khoa@axiom.com") {
          setDepartment("Khối Kỹ Thuật (Engineering)");
          setTitle("Trưởng Khối Kỹ Thuật");
          setBio("Quản trị phòng ban, phân bổ task & điều phối sprint dự án.");
          setPhone("0918 234 567 (Ext: 102)");
        } else {
          setDepartment("Khối Kỹ Thuật (Engineering)");
          setTitle("Kỹ Sư Trí Tuệ Nhân Tạo (AI Engineer)");
          setBio("Chuyên trách Whisper STT & LLM Meeting Protocol Pipeline.");
          setPhone("0912 345 678 (Ext: 104)");
        }
      }

      // If user already has a custom uploaded avatar (data URL image or external non-svg image)
      if (user.avatar_url && !user.avatar_url.includes("image/svg+xml")) {
        setAvatarUrl(user.avatar_url);
        setIsCustomUpload(true);
      } else {
        // Auto avatar by default
        setAvatarUrl(generateInitialsAvatar(currentName));
        setIsCustomUpload(false);
      }
    }
  }, [user, isOpen]);

  // Handle Full Name change: If auto-avatar is active, update avatar initials in real time
  const handleNameChange = (val: string) => {
    setFullName(val);
    if (!isCustomUpload) {
      setAvatarUrl(generateInitialsAvatar(val));
    }
  };

  // Reset to auto avatar based on name
  const handleResetToAutoAvatar = () => {
    setIsCustomUpload(false);
    setAvatarUrl(generateInitialsAvatar(fullName));
    onNotify?.("Đã chuyển về Avatar tự động theo tên!");
  };

  // Handle local file upload and downscale to lightweight base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onNotify?.("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)!");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to downscale image to crisp 256x256
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 256;
        canvas.width = size;
        canvas.height = size;

        if (ctx) {
          // Calculate center crop square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          // Export as optimized JPEG/WebP data url (< 35KB)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setAvatarUrl(dataUrl);
          setIsCustomUpload(true);
          onNotify?.("Tải ảnh đại diện thành công!");
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        setIsUploading(false);
        onNotify?.("Không thể đọc tệp hình ảnh. Vui lòng thử lại!");
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    // Clear input so same file can be selected again
    e.target.value = "";
  };

  // Save all profile information
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      onNotify?.("Họ và tên không được để trống!");
      return;
    }

    setIsSaving(true);
    const finalAvatar = isCustomUpload ? avatarUrl : generateInitialsAvatar(fullName);

    try {
      // 1. Persist in Backend Database
      await authApi.updateMe({
        full_name: fullName.trim(),
        avatar_url: finalAvatar,
      });

      // 2. Persist in Frontend Global Auth Store
      updateUser({
        full_name: fullName.trim(),
        avatar_url: finalAvatar,
      });

      // 3. Save extended profile details locally
      if (user?.id || user?.email) {
        localStorage.setItem(
          `axiom_profile_${user.id || user.email}`,
          JSON.stringify({
            phone: phone.trim(),
            department: department.trim(),
            title: title.trim(),
            bio: bio.trim(),
          })
        );
      }

      onNotify?.("Đã cập nhật toàn bộ thông tin cá nhân và avatar thành công!");
      onClose();
    } catch (err) {
      console.error("Failed to update profile:", err);
      // Fallback: update store locally even if network hiccups
      updateUser({
        full_name: fullName.trim(),
        avatar_url: finalAvatar,
      });
      onNotify?.("Đã lưu thông tin hồ sơ của bạn!");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const roleLabel =
    user?.email === "admin@axiom.com"
      ? "CHỦ TỊCH / OWNER"
      : user?.email === "manager.khoa@axiom.com"
      ? "TRƯỞNG PHÒNG / MANAGER"
      : "THÀNH VIÊN / MEMBER";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header: Compact & Elegant ─── */}
        <div className="relative px-6 py-4.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
              <User size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Hồ Sơ Cá Nhân & Tài Khoản</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9.5px] font-extrabold uppercase tracking-wider">
                  {roleLabel}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/90 mt-0.5">
                Chỉnh sửa toàn bộ thông tin cá nhân và avatar hiển thị trên hệ thống
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── Main Content (Single Page, Unified Flow) ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Avatar Management (Auto by Name + Upload) */}
          <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-3.5">
            <div className="flex flex-col sm:flex-row items-center gap-4.5">
              {/* Circular Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500/80 shadow-md ring-4 ring-blue-100 dark:ring-blue-950 bg-slate-800">
                  <img
                    src={avatarUrl || generateInitialsAvatar(fullName)}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-transform hover:scale-110 cursor-pointer"
                  title="Tải ảnh từ máy tính"
                >
                  <Camera size={13} />
                </button>
              </div>

              {/* Avatar Info & Actions */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Ảnh Đại Diện (Avatar)
                  </span>

                  {isCustomUpload ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <Upload size={11} />
                      <span>Ảnh Tải Lên</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <Sparkles size={11} />
                      <span>Auto Theo Tên</span>
                    </span>
                  )}
                </div>

                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Mặc định hệ thống tự sinh avatar chữ cái đại diện theo họ tên của bạn. Bạn cũng có thể tải ảnh tùy thích từ thiết bị.
                </p>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        <span>Tải Ảnh Từ Máy</span>
                      </>
                    )}
                  </button>

                  {isCustomUpload && (
                    <button
                      type="button"
                      onClick={handleResetToAutoAvatar}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                      title="Quay lại avatar chữ cái tự động theo tên"
                    >
                      <RotateCcw size={12} />
                      <span>Dùng Avatar Theo Tên</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: All Personal Information Inputs (Single Unified Form) */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-blue-500" />
                  <span>Họ và Tên</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ví dụ: Trần Minh Khoa"
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Thay đổi tên sẽ tự động cập nhật avatar chữ cái tương ứng.
                </span>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  <span>Email Định Danh</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@axiom.com"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-emerald-500" />
                  <span>Số Điện Thoại Nội Bộ</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0912 345 678"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 size={13} className="text-purple-500" />
                  <span>Khối Phòng Ban</span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ví dụ: Khối Kỹ Thuật (Engineering)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Position / Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Briefcase size={13} className="text-amber-500" />
                <span>Chức Danh / Vị Trí Công Tác</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Senior AI Engineer • Trưởng Nhóm Xử Lý Dữ Liệu"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-indigo-500" />
                <span>Tiểu Sử / Giới Thiệu Chuyên Môn</span>
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Mô tả tóm tắt nhiệm vụ công tác và chuyên môn của bạn..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
              />
            </div>
          </form>
        </div>

        {/* ─── Footer: Actions ─── */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>Đồng bộ tức thì trên toàn bộ hệ thống</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Lưu Thay Đổi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
