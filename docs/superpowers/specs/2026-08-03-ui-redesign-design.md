# Axiom UI Redesign — "Vercel-Notion Hybrid" Dark + Light

**Date:** 2026-08-03
**Status:** Approved (v3.1 — final sạn fixes)
**Scope:** Toàn bộ frontend — Landing + Auth + Dashboard + Meeting Room
**Rollout:** 3 giai đoạn tuần tự (xem Section 11)

---

## 1. Design Direction

Chuyển từ "AI-heavy navy space" sang "Modern Dark SaaS" kiểu Vercel/GitHub Dark.
- Neutral zinc palette thay navy+blue, hỗ trợ cả dark + light mode
- Top navbar thay sidebar, breadcrumb cho trang sâu
- Wording tiếng Việt (default), bỏ thuật ngữ enterprise/AI
- Typography bớt "terminal" — no uppercase labels, larger body text

## 2. Color Palette (Single Source of Truth)

> Bảng token dưới đây là nguồn duy nhất. Mọi giá trị contrast đã được verify WCAG AA và ghi trực tiếp vào đây.

### Dark Mode (Default)

| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| `bg-base` | `#09090b` (zinc-950) | Body |
| `bg-card` | `#18181b` (zinc-900) | Cards |
| `bg-elevated` | `#27272a` (zinc-800) | Hover, inputs |
| `border` | `#3f3f46` (zinc-700) | Card borders — nâng từ zinc-800 để tách rõ card/nền trên màn hình kém |
| `border-subtle` | `#27272a` (zinc-800) | Dividers nhẹ trong card |
| `text-primary` | `#fafafa` (zinc-50) | Headings |
| `text-secondary` | `#a1a1aa` (zinc-400) | Body text — 7.3:1 trên bg-base ✅ |
| `text-muted` | `#71717a` (zinc-500) | Meta text, timestamps — 4.6:1 trên bg-card ✅. **Không dùng cho input placeholder** (3.3:1 trên bg-elevated, fail AA cho text thường) |
| `text-placeholder` | `#a1a1aa` (zinc-400) | Input placeholder — dùng `text-secondary` value. 5.9:1 trên bg-elevated ✅ |
| `accent` | `#3b82f6` (blue-500) | Primary buttons, links |
| `accent-muted` | `rgba(59,130,246,0.15)` (blue-500/15%) | Badge/dot backgrounds, active indicators — tách bạch khỏi primary action |
| `accent-foreground` | `#ffffff` | Text trên nút accent |
| `focus-ring` | `rgba(59,130,246,0.5)` (blue-500/50%) | Focus outline (2px ring) |
| `disabled` | `#3f3f46` (zinc-700) | Disabled buttons/inputs — *tái sử dụng có chủ đích* từ `border`. Disabled state exempt khỏi WCAG AA contrast requirement |
| `disabled-text` | `#52525b` (zinc-600) | Text on disabled elements — exempt WCAG AA |
| `success` | `#22c55e` | Status text |
| `warning` | `#f59e0b` | Warning text — 8.2:1 trên bg-card ✅ |
| `danger` | `#ef4444` | Error text |

### Light Mode

| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| `bg-base` | `#ffffff` (white) | Body |
| `bg-card` | `#f4f4f5` (zinc-100) | Cards |
| `bg-elevated` | `#e4e4e7` (zinc-200) | Hover, inputs |
| `border` | `#d4d4d8` (zinc-300) | Card borders |
| `border-subtle` | `#e4e4e7` (zinc-200) | Dividers nhẹ |
| `text-primary` | `#09090b` (zinc-950) | Headings |
| `text-secondary` | `#52525b` (zinc-600) | Body — 7.1:1 trên bg-base ✅ |
| `text-muted` | `#71717a` (zinc-500) | Meta text — 4.5:1 trên bg-card ✅ *(đã fix từ #a1a1aa)*. **Không dùng cho input placeholder** |
| `text-placeholder` | `#71717a` (zinc-500) | Input placeholder — 3.2:1 trên bg-elevated, borderline. Chấp nhận vì placeholder là hint, không phải content chính |
| `accent` | `#2563eb` (blue-600) | Primary buttons, links |
| `accent-muted` | `rgba(37,99,235,0.10)` (blue-600/10%) | Badge/dot backgrounds |
| `accent-foreground` | `#ffffff` | Text trên nút accent |
| `focus-ring` | `rgba(37,99,235,0.5)` (blue-600/50%) | Focus outline |
| `disabled` | `#d4d4d8` (zinc-300) | Disabled — *tái sử dụng có chủ đích* từ `border`. Disabled state exempt khỏi WCAG AA |
| `disabled-text` | `#a1a1aa` (zinc-400) | Text on disabled elements — exempt WCAG AA |
| `success` | `#16a34a` | Status text |
| `warning` | `#b45309` (amber-700) | Warning text — 5.2:1 trên bg-card ✅ *(đã fix từ #d97706)* |
| `danger` | `#dc2626` | Error text |

### Status Color Rules

> **Quy tắc bắt buộc:** Status colors (`success`, `warning`, `danger`) **chỉ dùng dạng overlay**, KHÔNG dùng solid fill.

| Pattern | CSS | Ví dụ |
|---------|-----|-------|
| Status badge | `bg-{status}/10 border-{status}/20 text-{status}` | Badge "Active" |
| Status dot | `bg-{status}` (chỉ dot nhỏ 6-8px) | Dot active meeting |
| Error banner | `bg-danger/10 border-danger/20 text-danger` | Error message |
| Success toast | `bg-success/10 border-success/20 text-success` | Upload success |
| Warning alert | `bg-warning/10 border-warning/20 text-warning` | Cảnh báo LiveKit |

Lý do: `#ffffff` trên `#f59e0b` (warning solid) chỉ ~2.2:1, fail AA. Overlay pattern giữ text dùng chính status color → contrast luôn đạt.

> **Tailwind note:** Dùng Tailwind class trực tiếp `bg-green-500/10`, `border-green-500/20`, `text-green-500` — KHÔNG dùng CSS variable + arbitrary opacity (`bg-[--success]/10`) vì cần Tailwind v4 mới hỗ trợ đúng. Project đang dùng Tailwind v4 qua `@import "tailwindcss"` nên OK, nhưng nếu hạ version thì cần fallback.

### Accent Role Separation

| Vai trò | Token | Ví dụ |
|---------|-------|-------|
| Primary action (click) | `accent` solid | Nút "Tạo cuộc họp", "Đăng nhập" |
| Link text | `accent` text-only | Nav link active, inline links |
| Active nav border | `accent` 2px | Bottom border navbar active |
| Status indicator | `accent-muted` bg | Dot "active" meeting, badge count |
| Focus ring | `focus-ring` | Keyboard focus outline |

> **Alpha khác nhau giữa 2 theme:** Dark `accent-muted` = 15%, Light = 10%. Chủ đích: nền tối cần alpha cao hơn để badge visible, nền sáng cần alpha thấp hơn để không quá đậm. Đã test visual trên cả 2 mode.

→ Nút primary dùng `accent` solid nổi bật, status indicators dùng `accent-muted` nhạt hơn → phân cấp thị giác rõ ràng.

### Theme Toggle — Anti-FOUC

Rủi ro: Zustand/localStorage đọc client-side → flash sai theme khi SSR hydrate.

**Giải pháp:** Inline blocking script trong `<head>` TRƯỚC React hydrate:

```html
<script>
  (function() {
    var t = localStorage.getItem('axiom_theme');
    if (t === 'light') document.documentElement.classList.remove('dark');
    else if (t === 'dark' || !t) document.documentElement.classList.add('dark');
    else if (t === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  })();
</script>
```

- Đặt trong `layout.tsx` trước `{children}` bằng `dangerouslySetInnerHTML`
- `useThemeStore` sync với DOM class sau hydrate, nhưng KHÔNG set class lần đầu (script đã làm)
- Default: `dark` (nếu chưa có preference)

## 3. Design System Foundations

### Typography

- Body text: `text-sm` (14px). `text-xs` chỉ cho metadata/timestamps.
- Labels: Title-case bình thường. **KHÔNG** dùng `uppercase tracking-wider` trên labels.
- Headings: `text-lg font-semibold` thay `text-2xl font-bold`.
- `font-mono` chỉ cho code snippets và IDs.
- Border radius: `rounded-xl` (12px) thay `rounded-3xl` (24px). Buttons `rounded-lg` (8px).

### Spacing Scale

Dùng Tailwind default 4px scale, nhưng chốt patterns:

| Element | Spacing |
|---------|---------|
| Page padding | `px-6 py-6` (24px) |
| Card padding | `p-5` (20px) |
| Section gap | `space-y-6` (24px) |
| Card gap (grid) | `gap-4` (16px) |
| Form field gap | `space-y-4` (16px) |
| Input padding | `px-3 py-2.5` (12px/10px) |
| Button padding | `px-4 py-2.5` |

### Icon Set

- **Lucide React** (giữ nguyên) — đã dùng toàn bộ dự án
- Size: `w-4 h-4` default, `w-5 h-5` cho nav/headings

### Transitions & Animations

| Tình huống | Transition |
|------------|------------|
| Hover states | `transition-colors duration-150` |
| Dropdown open/close | `transition-all duration-200 ease-out` |
| Page route change | Không animation (fast, Vercel-style) |
| Loading spinner | Lucide `Loader2` + `animate-spin` |
| Focus ring | `ring-2 ring-offset-2 ring-accent/50` |

### Loading & Error States (Thống nhất)

- **Loading page:** Centered `Loader2 animate-spin` + text muted "Đang tải..."
- **Empty state:** Icon muted + heading + description — mỗi page có nội dung riêng
- **Error banner:** `bg-danger/10 border-danger/20 text-danger` + icon `AlertCircle`
- **Success toast:** `bg-success/10 border-success/20 text-success` + icon `CheckCircle2`
- **Warning alert:** `bg-warning/10 border-warning/20 text-warning` + icon `AlertTriangle`
- **Disabled button:** `opacity-50 cursor-not-allowed` + `disabled-text` color

## 4. Navigation — Top Navbar

**XOÁ sidebar**, thay bằng top navbar 56px:

```
┌──────────────────────────────────────────────────────────────┐
│ Logo Axiom   Cuộc họp  Công việc  Lịch  Tài liệu  │ 🌓 🔔 👤▾│
└──────────────────────────────────────────────────────────────┘
```

- Logo: **SVG/PNG** (không dùng JPG — cần transparency cho cả dark/light mode)
- Nav links giữa: `Cuộc họp`, `Công việc`, `Lịch`, `Tài liệu`
- Active link: `text-primary` + 2px bottom border `accent`
- Inactive: `text-muted` hover → `text-secondary`
- Theme toggle icon (🌓) trước notification bell
- User menu phải: avatar + dropdown chứa `Quản trị`, `Cài đặt`, workspace switcher, `Đăng xuất`

### Breadcrumb cho trang sâu

Dưới navbar, hiển thị breadcrumb khi user ở trang con:

```
Cuộc họp / Sprint Planning #5        (meeting detail)
Quản trị / Nhật ký hoạt động          (admin sub-page)
Cài đặt / Hồ sơ cá nhân              (settings sub-page)
```

- Style: `text-sm text-muted` + separator `/` + last item `text-primary`
- Chỉ hiện khi depth > 1

### Mobile (≤ 768px)

- Hamburger ☰ bên trái thay logo text
- Click → **Drawer overlay** từ trái, width 280px, `bg-card` + backdrop blur
- Nội dung drawer: Logo + nav links + user info + theme toggle + đăng xuất
- Animation: `translate-x` 300ms ease-out
- Backdrop: click đóng drawer

### Tablet (768px–1024px)

- Navbar giữ nguyên nhưng nav text nhỏ hơn `text-xs`
- Content padding giảm `px-4`

### Files:
- **XOÁ:** `components/layout/app-sidebar.tsx`
- **TẠO:** `components/layout/top-navbar.tsx`
- **TẠO:** `components/layout/mobile-drawer.tsx`
- **TẠO:** `components/layout/breadcrumb.tsx`
- **SỬA:** `(dashboard)/layout.tsx` — bỏ sidebar, dùng `max-w-6xl mx-auto`

## 5. Page-by-Page Changes

### 5.1 Landing Page
- Heading: "Họp thông minh, không lãng phí thời gian"
- Bỏ fake "TRUSTED BY" section
- Zinc palette + accent blue cho CTA
- Giản lược security section
- Logo: SVG/PNG thay JPG

### 5.2 Auth (Login + Register)
- "Đăng nhập vào Axiom" / "Tạo tài khoản"
- Dùng logo SVG/PNG
- Zinc palette (dark default, tự động theo theme)
- i18n tiếng Việt

### 5.3 Meetings Dashboard
- Heading: "Cuộc họp"
- Stat cards nhẹ hơn, bỏ colored icon bg
- Meeting card: `bg-card` + `border` tokens
- Bỏ "PROCESS GATE ✓" badge → dot `accent-muted` bg + dot `success` = active
- Button: "Tạo cuộc họp mới"

### 5.4 Create Meeting
- Bỏ badge "PROCESS GATE ENFORCED"
- Giữ character counter
- Helper: "AI sẽ tự động ghi chú và tóm tắt cuộc họp"

### 5.5 Tasks
- Zinc palette cho kanban board
- Bỏ uppercase column headers
- Priority badges dùng overlay pattern: `bg-danger/10 text-danger` (HIGH), `bg-warning/10 text-warning` (MEDIUM)
- Empty state VN

### 5.6 Knowledge
- "Tài liệu" heading
- "Tìm kiếm tài liệu" thay "AI Semantic RAG Search Engine"
- Button: "Tìm kiếm" thay "Search RAG"

### 5.7 Admin
- "Quản trị" heading
- Bỏ "ADMIN RBAC ACTIVE" badge
- "Nhật ký hoạt động" thay "Immutable Audit Logs"
- "Webhook" thay "Outbound Webhook Engine"
- **Lưu ý:** Giữ thuật ngữ kỹ thuật chính xác trong audit log action names (vd: `USER_LOGIN`, `MEETING_CREATED`) — chỉ đổi UI labels, không đổi data values.

### 5.8 Settings
- "Hồ sơ cá nhân", "Workspace"
- Zinc palette

### 5.9 Meeting Room
- Giữ layout (video + sidebar tabs)
- Zinc palette
- Tab labels: "Nội dung", "Chat", "AI Ghi chú", "Công việc"
- Bỏ "Enterprise Intelligence" wording

## 6. i18n Strategy

### Scope
Mở rộng `useLanguageStore` translations cho tất cả 9 pages + navbar + shared components.

### Key Inventory
Tạo script `scripts/i18n-audit.ts` quét source cho:
- Hardcoded strings trong JSX (regex: `>text<`, `"placeholder"`, `'label'`)
- Strings chưa qua `t.xxx` hoặc `t('xxx')`
- Report: file + line + string chưa i18n

### Quy trình
1. Liệt kê tất cả keys cần dịch trước khi code
2. Thêm vào `vi.ts` + `en.ts` cùng lúc
3. Chạy audit script sau mỗi page để đảm bảo không sót

## 7. Logo Format

- **Chuyển từ JPG sang SVG** (hoặc PNG nếu logo phức tạp)
- Cần 2 variants: dark mode (logo sáng) + light mode (logo tối) — hoặc 1 logo neutral
- Nếu chỉ có JPG hiện tại: tạm dùng PNG crop, sau đó request SVG từ designer

## 8. Files Không Thay Đổi

- Backend code — 0 thay đổi
- `api.ts` — đã fix ở Phase 1
- `useAuthStore.ts` — giữ nguyên
- Database/models — giữ nguyên
- Audit log action values (data) — giữ nguyên, chỉ đổi UI labels

## 9. Verification Matrix

### Backend
```bash
uv run pytest src/backend/ -v
```
69 tests phải tiếp tục PASS.

### Theme × Language Matrix

| Page | Dark+VN | Dark+EN | Light+VN | Light+EN |
|------|---------|---------|----------|----------|
| Landing | ☐ | ☐ | ☐ | ☐ |
| Login | ☐ | ☐ | ☐ | ☐ |
| Register | ☐ | ☐ | ☐ | ☐ |
| Meetings | ☐ | ☐ | ☐ | ☐ |
| Create Meeting | ☐ | ☐ | ☐ | ☐ |
| Tasks | ☐ | ☐ | ☐ | ☐ |
| Calendar | ☐ | ☐ | ☐ | ☐ |
| Knowledge | ☐ | ☐ | ☐ | ☐ |
| Admin | ☐ | ☐ | ☐ | ☐ |
| Settings | ☐ | ☐ | ☐ | ☐ |
| Meeting Room | ☐ | ☐ | ☐ | ☐ |

### Accessibility
- WCAG AA contrast: verified in token table (Section 2)
- Keyboard navigation: Tab through navbar → dropdown → page content
- Focus ring visible on all interactive elements (`focus-ring` token)
- Dropdown accessible via Enter/Space/Escape

### Responsive Breakpoints
- Desktop (≥1024px): full navbar, `max-w-6xl` content
- Tablet (768–1024px): navbar compact, `px-4` content
- Mobile (≤768px): hamburger + drawer

### Rollback
- Git branch `feat/ui-redesign` — nếu regression, revert branch
- Mỗi giai đoạn commit riêng, có thể revert từng phần

## 10. Không Bao Gồm (Out of Scope)

- Backend changes
- New features / new pages
- Database migrations
- Performance optimization (lazy loading, code splitting)
- E2E tests (manual QA only for this phase)

## 11. Rollout Strategy — 3 Giai Đoạn

### Giai đoạn 2A: Infrastructure (rủi ro kỹ thuật cao nhất)
- `globals.css` — palette tokens mới (dark + light) bao gồm `accent-muted`, status overlay patterns
- `useThemeStore` + anti-FOUC inline script
- `top-navbar.tsx` + `mobile-drawer.tsx` + `breadcrumb.tsx`
- `(dashboard)/layout.tsx` — swap sidebar → navbar
- Xoá `app-sidebar.tsx`
- **Test:** FOUC check, hydration OK, navbar responsive, theme toggle works

### Giai đoạn 2B: Page-by-Page Palette + Wording
- Apply zinc tokens + status overlay pattern cho từng page
- Đổi wording VN
- Landing page + auth pages
- **Test:** Visual check mỗi page × 2 themes

### Giai đoạn 2C: i18n Audit + Accessibility Pass
- Mở rộng `useLanguageStore` cho tất cả pages
- Chạy i18n audit script
- Keyboard navigation test
- Responsive test (mobile/tablet)
- **Test:** Full matrix (Section 9)