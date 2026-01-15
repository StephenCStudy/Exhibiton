# Hướng dẫn Deploy Website (Client + API)

Tài liệu này hướng dẫn chi tiết cách deploy dự án này lên **Vercel** (Frontend) và **Render** (Backend).

## 1. Chuẩn bị

Đảm bảo bạn đã:

1. Đăng ký tài khoản [Vercel](https://vercel.com).
2. Đăng ký tài khoản [Render](https://render.com).
3. Đẩy toàn bộ code hiện tại lên **GitHub** (chế độ Public hoặc Private đều được).

---

## 2. Cấu hình Backend (API)

Trước khi deploy lên Render, bạn cần cập nhật `api/package.json` để hỗ trợ build và chạy trên môi trường production.

### Bước 2.1: Cập nhật `api/package.json`

Mở file `api/package.json` và thay đổi phần `scripts` như sau:

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/src/server.js",
  "dev": "nodemon --watch src --exec tsx src/server.ts",
  "seed": "tsx src/scripts/seed.ts"
}
```

> **Giải thích:** Render cần lệnh `build` để biên dịch TypeScript sang JavaScript và lệnh `start` để chạy file đã biên dịch (`dist/...`).

### Bước 2.2: Deploy lên Render

1. Truy cập [dashboard.render.com](https://dashboard.render.com).
2. Chọn **New +** -> **Web Service**.
3. Kết nối với repository GitHub của bạn.
4. Điền các thông tin sau:
   - **Name**: Tên dịch vụ (ví dụ: `my-web-api`).
   - **Root Directory**: `api` (Rất quan trọng).
   - **Environment**: Node.
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Kéo xuống phần **Environment Variables** và thêm các biến cần thiết (copy từ file `.env` của bạn):
   - `MONGO_URI`: Chuỗi kết nối MongoDB Atlas của bạn.
   - `JWT_SECRET`: Khóa bí mật cho JWT.
   - `PORT`: (Render sẽ tự động thêm, bạn không cần thêm, nhưng code của bạn phải dùng `process.env.PORT` - code hiện tại đã có).
6. Nhấn **Create Web Service**.
7. Chờ quá trình build hoàn tất. Sau khi xong, bạn sẽ nhận được một URL (ví dụ: `https://my-web-api.onrender.com`). Hãy copy URL này.

---

## 3. Cấu hình Frontend (Client)

### Bước 3.1: Deploy lên Vercel

1. Truy cập [vercel.com/new](https://vercel.com/new).
2. Import repository GitHub của bạn.
3. Tại màn hình **Configure Project**:
   - **Framework Preset**: Vite (Vercel thường tự nhận diện).
   - **Root Directory**: Nhấn 'Edit' và chọn thư mục `client`.
   - **Build Command**: `npm run build` (Mặc định).
   - **Output Directory**: `dist` (Mặc định).
4. Mở phần **Environment Variables**:
   - Thêm biến `VITE_API_URL`.
   - Giá trị: URL của Backend bạn vừa copy ở Bước 2.2 + thêm đuôi `/api`.
     - Ví dụ: `https://my-web-api.onrender.com/api`
     - _Lưu ý: Không có dấu `/` ở cuối cùng._
5. Nhấn **Deploy**.

### Bước 3.2: Kiểm tra

- Sau khi Vercel deploy xong, truy cập vào đường link website được cấp.
- Thử các tính năng gọi API (đăng nhập, lấy dữ liệu) xem đã hoạt động chưa.
- Nếu gặp lỗi CORS, hãy kiểm tra lại Backend xem đã cài `cors` chưa (Code hiện tại trong `app.ts` đã có `app.use(cors())`, nến sẽ hoạt động tốt với mọi domain).

---

## Gỡ lỗi thường gặp

1. **Lỗi 404 trên Frontend khi reload trang**:
   - File `client/vercel.json` đã được cấu hình rewrite cho SPA, nên lỗi này sẽ không xảy ra.
2. **Lỗi kết nối Database**:

   - Kiểm tra kỹ `MONGO_URI` trên Render. Đảm bảo IP của Render được phép truy cập MongoDB (hoặc set 0.0.0.0/0 trong Network Access của MongoDB Atlas).

3. **Backend không chạy được**:
   - Kiểm tra Logs trên Render.
   - Đảm bảo lệnh `build` chạy thành công (tạo ra thư mục `dist`).
   - Đảm bảo file `server.js` nằm đúng đường dẫn `dist/src/server.js`.
