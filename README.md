# FloodWatch Admin — KLTN-007

> Giao diện quản trị cho hệ thống theo dõi ngập lụt TP.HCM. Dành cho **Admin** và **Moderator** — đăng nhập, kiểm duyệt báo cáo, quản lý người dùng và xem thống kê.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Tính năng chính

| Module | Mô tả | Quyền |
|--------|--------|--------|
| **Dashboard** | Tổng quan, link nhanh, sensor realtime | Admin, Moderator |
| **Kiểm duyệt báo cáo** | Xem tất cả / chờ duyệt / đã duyệt / đã từ chối, xem ảnh báo cáo, Duyệt/Từ chối | Admin, Moderator |
| **Quản lý user** | Danh sách user, đổi vai trò, bật/tắt tài khoản, tính lại độ tin cậy | Admin, Moderator |
| **Tạo tài khoản** | Tạo admin/moderator/user mới (username, email, password, role) | Chỉ Admin |
| **Xếp hạng tin cậy** | Bảng xếp hạng reporter theo điểm tin cậy | Admin, Moderator |
| **Thống kê báo cáo** | Thống kê theo giờ/ngày | Admin, Moderator |
| **Nhật ký hệ thống** | Audit log (Audit Log) | Chỉ Admin |

- **Phân quyền:** Chỉ role `admin` và `moderator` đăng nhập được; `user` thường không vào app admin.
- **Ảnh báo cáo:** Mỗi báo cáo hiển thị `photo_url` (thumbnail + modal xem lớn).

---

## Công nghệ

- **React 18** + **Vite 7** — SPA, HMR, build tối ưu
- **React Router 6** — Điều hướng, bảo vệ route theo role
- **Tailwind CSS 3** — Giao diện responsive, utility-first
- **Axios** — HTTP client, interceptors (token, 401/403)
- **Recharts** — Biểu đồ thống kê
- **React Icons (Fa6)** — Icon nhất quán

---

## Yêu cầu hệ thống

- **Node.js** 18+
- **Backend API** chạy và cấu hình đúng `VITE_API_BASE_URL` (cùng với FE user nếu có)

---

## Cài đặt & Chạy

### 1. Clone & cài đặt

```bash
git clone https://github.com/minh10102003/KLTN-007-FloodWatch-Admin-FE.git
cd KLTN-007-FloodWatch-Admin-FE
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` tại thư mục gốc (tham khảo `.env.example`):

```env
VITE_API_BASE_URL=https://kltn-007-floodwatch-be-production.up.railway.app
```

Nếu bạn chạy backend local, có thể đổi lại thành URL local tương ứng.

### 3. Chạy development

```bash
npm run dev
```

Mở trình duyệt theo URL Vite (vd: `http://localhost:5173`). Đăng nhập bằng tài khoản **admin** hoặc **moderator**.

### 4. Build production

```bash
npm run build
npm run preview   # xem bản build (tùy chọn)
```

Thư mục `dist/` dùng để deploy (static hosting, Nginx, Vercel, v.v.).

---

## Cấu trúc dự án (tóm tắt)

```
src/
├── config/
│   └── apiConfig.js      # BASE_URL, API_ENDPOINTS
├── services/
│   └── api.js            # login, getUsers, createUser, fetchPendingReports,
│                         # fetchCrowdReports, moderateReport, getReportStats, ...
├── utils/
│   ├── auth.js           # getCurrentUser, isAdmin, isModerator, canAccessAdminApp
│   └── reliabilityHelpers.js
├── components/
│   └── layout/           # Layout, Sidebar (menu theo role)
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── ModerationPage.jsx    # Kiểm duyệt + xem ảnh + filter trạng thái
│   ├── UserManagementPage.jsx # Quản lý user + tạo tài khoản (admin)
│   ├── ReliabilityRankingPage.jsx
│   ├── ReportStatsPage.jsx
│   └── AuditLogPage.jsx
└── App.jsx               # Routes, AdminRoute, AdminOnlyRoute
```

---

## API sử dụng (tóm tắt)

- `POST /api/auth/login` — Đăng nhập
- `GET /api/reports/pending` — Báo cáo chờ duyệt
- `GET /api/crowd-reports` — Tất cả báo cáo (có thể filter `status`)
- `PUT /api/reports/:id/moderate` — Duyệt / Từ chối
- `GET /api/auth/users` — Danh sách user (và `POST` tạo user — chỉ Admin)
- Các endpoint khác: profile, role, active, reliability-ranking, stats, audit-logs, flood-data, sensors, v.v.

---

## Đóng góp & Liên hệ

- **Khoá luận / Đồ án:** KLTN-007 — FloodWatch (Nhóm 007)
- **Repository:** [KLTN-007-FloodWatch-Admin-FE](https://github.com/minh10102003/KLTN-007-FloodWatch-Admin-FE)

Nếu bạn là thành viên dự án, clone repo, tạo branch, commit và mở Pull Request theo quy trình của nhóm.

---

**FloodWatch Admin** — Quản trị đơn giản, an toàn, bám sát nghiệp vụ kiểm duyệt và quản lý người dùng cho hệ thống theo dõi ngập lụt.
