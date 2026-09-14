# Liquid Glass V2 — viền thấu kính và Fresnel

## Phạm vi

Giữ nguyên layout, bảng màu, nội dung và hành vi âm thanh của Aera. Milestone trước thay đổi ở `milestones/v1/`. Bản skill đã lưu tại `~/AISkills/liquid-glass` vẫn là component V1; lần này không ghi đè bộ tái sử dụng đó.

## Thay đổi thuật toán

- Tiết diện mép: thay cung tròn bằng superellipse bậc 4, `h(t) = (1 - (1-t)^4)^(1/4)`. Pháp tuyến được suy ra từ đạo hàm của chiều cao, có tỷ lệ độ dày/độ rộng mép. Mép dốc, phần nối vào giữa kính phẳng và mượt.
- Tia nhìn vuông góc màn hình được khúc xạ theo Snell với IOR 1.5. Góc lệch đi qua chiều dày cho độ dịch chuyển mẫu nền hướng vào trong.
- Fresnel điện môi không phân cực: lấy trung bình phản xạ s/p. Dịch chuyển được làm dịu bằng `1 - F` ở vùng phản xạ mạnh. Đây là lựa chọn dựng hình UI: Fresnel về vật lý quyết định năng lượng, không thay đổi hướng tia. Không gọi mô hình này là bộ ray tracer chính xác.
- Map highlight độc lập dùng Fresnel, một dải sáng mềm ở mép và lobe chuyển tiếp trên bevel. Alpha bằng 0 ở giữa; độ rộng viền thay đổi liên tục theo hình học, thay cho mask 1.5 px đều của V1. Conic gradient cung cấp hướng ánh sáng nghệ thuật, không phải tính BRDF đầy đủ.
- Bù `128/255 - 0.5` bằng feComponentTransfer để vùng trung tính không vô tình dịch nền. Làm blur trước displacement để không làm nhòe mép khúc xạ sau cùng.
- Profile quang học được tính thành bảng 513 mẫu mỗi lần thay đổi kích thước. Pointer chỉ đổi gradient; không tính lại map. Giới hạn map 2 triệu pixel.

`glass-optics.js` chứa toán học không phụ thuộc DOM; `liquid-glass.js` dựng map/SVG; `liquid-glass.css` ghép vật liệu. Đọc `index.html` để xem thứ tự tải các script.

## Kiểm chứng

`npm run check` kiểm tra cú pháp; `npm test` kiểm tra giá trị hữu hạn, phản xạ trong [0,1], dịch chuyển hướng vào trong có giới hạn, giữa kính trung tính, nối vào giữa mượt, phản xạ tăng ở góc xiên, không khúc xạ khi hai môi trường có cùng IOR.

`node tests/browser.mjs` cần Chromium đã mở với `--remote-debugging-port=9225`. Script chụp cả V1/V2 ở 1440/390/320/768 px, kiểm tra tràn ngang, lỗi runtime, các nút, reduced motion và bật/tắt displacement trên cùng nền sọc. Ảnh được lưu vào `artifacts/`. Script tắt Chromium mà nó kết nối sau khi hoàn thành; chỉ dùng một instance kiểm thử riêng.

Đã chạy thành công và xem ảnh desktop cùng cận cảnh nền sọc V1/V2. Font mạng được tắt trong kiểm thử để ảnh ổn định, nên ảnh dùng font hệ thống. Khác biệt ảnh xác nhận displacement được render, không chứng minh mức độ tương đồng định lượng với Apple. Chưa kiểm tra trực tiếp trên Safari, Firefox hoặc thiết bị iOS.

## Nguồn và giới hạn

- [Apple — Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/): lensing, highlight theo hình học/chuyển động, vật liệu thích ứng; tài liệu không công bố thuật toán shader của Apple.
- [PBRT — Specular Reflection and Transmission](https://www.pbr-book.org/4ed/Reflection_Models/Specular_Reflection_and_Transmission): Snell và Fresnel điện môi.

V2 là mô phỏng web lấy cảm hứng từ các nguyên lý này. Full refraction vẫn đi theo nhánh Chromium; trình duyệt khác dùng blur với map highlight. Chưa có chromatic dispersion, merging, phản xạ môi trường thật hoặc đổi màu chữ tự động. Hiệu ứng còn phụ thuộc chi tiết nền và backdrop root của trình duyệt.
