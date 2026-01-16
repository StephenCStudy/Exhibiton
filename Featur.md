# Tính năng mới - v1.2.0

## Tự động đồng bộ dữ liệu từ Mega lên MongoDB

- Khi có video mới hoặc folder comic mới được upload lên Mega, hệ thống sẽ tự động phát hiện và chỉ lấy các dữ liệu mới này để lưu vào MongoDB.
- Không cần chạy lại toàn bộ sync từ đầu, chỉ cập nhật phần thay đổi mới nhất.
- Quá trình kiểm tra và đồng bộ sẽ tự động thực hiện ở backend mỗi khi app khởi động.
- Nếu Mega có thay đổi (thêm video, thêm folder truyện), backend sẽ lưu lại các thay đổi này vào MongoDB.
- Đảm bảo tối ưu hiệu năng, không làm trang web bị chậm hoặc block event loop (Node.js chỉ chạy 1 core):
  - Chỉ kiểm tra và cập nhật phần mới, không quét lại toàn bộ dữ liệu.
  - Sử dụng các thao tác async, không block request của người dùng.
  - Sync chạy nền, không ảnh hưởng đến tốc độ load trang.

**Lợi ích:**

- Dữ liệu luôn tự động cập nhật theo Mega.
- Không cần thao tác thủ công hay chờ sync toàn bộ.
- Trải nghiệm người dùng mượt mà, không bị delay khi truy cập.

---
