# Changelog - Web-Exbi Project

## [1.1.0] - 2026-01-16

### 🎨 UI/UX Improvements

#### Toast Notification System

- Thêm Toast component (`Toast.tsx` + `Toast.css`) thay thế `alert()` trên toàn app
- 4 loại toast: `success`, `error`, `warning`, `info`
- Animation slide-in từ phải (desktop) / từ dưới (mobile)
- Tự động ẩn sau 3 giây
- Click để đóng sớm

#### Confirm Dialog

- Thêm custom confirm dialog thay thế `confirm()` browser
- Animation scale-in đẹp mắt
- Áp dụng tại `FavoritesPage` khi xóa tất cả yêu thích

#### Dashboard Admin Pages

- Vô hiệu hóa chức năng Create/Edit/Delete tại `/dashboard/videos` và `/dashboard/comics`
- UI giữ nguyên, chỉ disable các action
- Nút Edit/Delete: bỏ background, làm nhỏ gọn cho mobile (32x32px)
- Hiệu ứng hover đổi màu, active scale

#### Comics Page (`/comics`)

- Fix hiển thị số trang đúng (thay vì "45 Chapters" cứng)
- Thêm field `pageCount` vào Comic model
- Grid có margin-bottom để không bị che bởi pagination

#### Favorites Page (`/dashboard/favorites`)

- Fix thumbnail comic: dùng API `/api/comics/:id/cover` thay vì Mega link
- Fix thumbnail video: dùng `thumbnailFromDb` prop
- Compact video card info (padding nhỏ hơn, title 1 dòng)

#### Dashboard Page (`/dashboard`)

- Video mới nhất hiển thị thumbnail từ database

#### Comic Admin Page (`/dashboard/comics`)

- Fix thumbnail load từ API endpoint

### 🖼️ Thumbnail System Overhaul

#### VideoThumbnail Component

- Thêm `thumbnailFromDb` prop để ưu tiên thumbnail từ database
- Thêm `DEFAULT_THUMBNAIL` placeholder khi không có thumbnail
- Priority: DB thumbnail → API endpoint → Default placeholder → Gradient

#### Lazy Loading & Caching

- Session cache service (`sessionCache.ts`) cho video/comic data
- 30 phút cache expiry
- Background refresh data

#### Auto-capture Thumbnail

- `VideoDetailPage`: Tự động capture thumbnail khi video load (`onCanPlayThrough`)
- Canvas-based screenshot tại giây thứ 2
- Lưu base64 thumbnail vào MongoDB

### 📖 Comic Reader Improvements

#### Expandable Preview

- Trang comic/id chỉ load 9 ảnh preview ban đầu
- Nút "Xem thêm X trang..." để mở rộng
- Nút "Thu gọn" để quay lại 9 ảnh
- Animation bounce cho icon mũi tên

### 🗄️ Database Updates

#### Comic Schema

- Thêm field `pageCount: Number` để lưu số trang
- Update seed.ts để lưu pageCount khi tạo comic

#### Video Schema

- Field `thumbnail` lưu base64 data URL
- Field `duration` lưu thời lượng (seconds)

### 🔧 Backend Changes

#### Seed Script (`seed.ts`)

- Thêm `pageCount: pages.length` khi tạo comic

### 📱 Mobile Optimizations

- Toast container ở bottom trên mobile
- Compact card info cho video
- Smaller action buttons

---

## [1.0.4] - Previous Version

### Tổng quan

Refactor toàn bộ hệ thống lấy dữ liệu từ Mega.nz, thay đổi từ việc fetch trực tiếp từ Mega mỗi request sang cơ chế đồng bộ (sync) dữ liệu vào MongoDB. Điều này giúp:

- **Tăng tốc độ**: Dữ liệu được cache trong database, không cần gọi Mega API mỗi lần
- **Giảm tải Mega API**: Chỉ sync định kỳ thay vì gọi liên tục
- **Dữ liệu nhất quán**: Tất cả thông tin (bao gồm cả pages của comic) được lưu trong DB

---

### Backend Changes (`api/`)

#### Schema Updates

**Video Schema (`src/models/Video.ts`)**

```typescript
// Trước
{
  title: string;
  megaVideoLink: string;
  thumbnail?: string;
  duration?: number;
}

// Sau
{
  name: string;        // Đổi từ title, unique
  link: string;        // Đổi từ megaVideoLink
  thumbnail: string;   // Bắt buộc
  duration: number;    // Bắt buộc
}
```

**Comic Schema (`src/models/Comic.ts`)**

```typescript
// Trước
{
  name: string;
  coverImage: string;
  megaFolderLink: string;
}

// Sau
{
  name: string;           // Unique
  thumbnail: string;      // Đổi từ coverImage
  description?: string;   // Mới
  pages: [{               // Mới - lưu trực tiếp pages
    pageNumber: number;
    image: string;        // Mega link của từng page
  }];
}
```

#### New Service: SyncService (`src/services/mega/SyncService.ts`)

Service mới để đồng bộ dữ liệu từ Mega → MongoDB:

```typescript
class SyncService {
  async syncVideos(): Promise<SyncResult>;
  async syncComics(): Promise<SyncResult>;
  async syncAll(): Promise<{ videos: SyncResult; comics: SyncResult }>;
  async getMegaStructure(): Promise<MegaStructure>;
}
```

#### New CLI Script (`src/scripts/sync-mega.ts`)

```bash
# Sync videos
npx ts-node src/scripts/sync-mega.ts videos

# Sync comics
npx ts-node src/scripts/sync-mega.ts comics

# Sync tất cả
npx ts-node src/scripts/sync-mega.ts all
```

---

### Client Changes (`client/`)

#### Type Updates (`src/utils/types.ts`)

```typescript
interface Video {
  _id: string;
  name: string;
  link: string;
  thumbnail: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

interface Comic {
  _id: string;
  name: string;
  thumbnail: string;
  description?: string;
  pages?: ComicPage[];
  pageCount?: number; // New in 1.1.0
  createdAt: string;
  updatedAt: string;
}
```

---

### Cấu trúc Mega mong đợi

```
Root/
├── Videos/
│   ├── video1.mp4
│   ├── video2.mkv
│   └── ...
└── Comics/
    ├── Comic Name 1/
    │   ├── 001.jpg
    │   ├── 002.jpg
    │   └── ...
    └── ...
```

---

### Verification

```bash
# Backend
cd api && npx tsc --noEmit  # ✓ Pass

# Client
cd client && npx tsc --noEmit  # ✓ Pass
```
