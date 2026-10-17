# Phạm vi cải tiến automation — đã xác nhận và triển khai local

Ngày: 17/10/2026. Căn cứ: `REPORT.md` và các bằng chứng API live cùng thư mục.

Cập nhật theo xác nhận của người dùng: triển khai toàn bộ phạm vi; **không dùng Docker**, dùng DB và AI trong `backend/.env`. Bản local hiện chạy frontend production build tại `http://localhost:8080`, backend tại `http://localhost:5000`. Hướng dẫn và kết quả cuối ở `../../docs/LOCAL_AUTOMATION.md`. Các lựa chọn Docker ở phần chuẩn bị dưới đây là đề xuất ban đầu, đã được thay bằng cấu hình người dùng cung cấp.

## Mục tiêu và những lựa chọn đã chốt

- Tự dùng dữ liệu từ backend và thông tin đã nhập cho công việc hiện tại; chỉ hỏi khi thiếu, không hợp lệ hoặc mâu thuẫn.
- Chỉ một lần xác nhận cuối trước khi nộp chính thức; NVQS gộp địa chỉ và nội dung cam kết trong lần xác nhận đó.
- Giữ quy tắc tự duyệt hiện có; cán bộ quyết định các ngoại lệ bằng nút.
- Hỗ trợ đủ 5 biểu mẫu đang có. Chat vẫn phục vụ tư vấn và nhập yêu cầu tự do.
- Mục tiêu nghiệm thu cho hồ sơ đã đủ dữ liệu: chọn thủ tục và xác nhận nộp, không phải gõ lại thông tin.

## 1. Hồ sơ và dữ liệu dùng chung

Tạo một dịch vụ backend tổng hợp ngữ cảnh dùng chung cho HTTP, Socket và biểu mẫu. Lấy danh tính theo phiên đăng nhập; lấy học vụ và hạn ngạch từ nguồn server. Thông tin người dùng sửa cho đơn hiện tại được lưu trong bản nháp, không tự ghi đè hồ sơ gốc của trường.

Ghi nguồn dữ liệu theo trường để phân biệt dữ liệu backend, người dùng đã nhập và dữ liệu demo. Loại bỏ việc tự chèn thông tin cá nhân mẫu vào hồ sơ thật. Với demo, dữ liệu mẫu phải thuộc đúng hồ sơ demo và được nhận diện rõ.

SĐT/địa chỉ đã có được điền sẵn và xuất hiện ở bản xem trước. Lựa chọn nơi nhận có thể dùng lại khi người dùng đã chọn trong công việc hiện tại; không tự đoán nơi nhận nếu chưa có lựa chọn. Quy tắc không bịa dữ liệu tiếp tục áp dụng.

## 2. Bản nháp bền vững và một công việc xuyên suốt

Thêm cấu trúc lưu bản nháp trong PostgreSQL: chủ sở hữu, loại đơn, dữ liệu và nguồn, phiên bản, phần cần bổ sung, hành động đang chờ, thời điểm cập nhật và liên kết đến đơn chính thức sau khi nộp.

Trạng thái nghiệp vụ dự kiến: đang chuẩn bị → cần bổ sung → sẵn sàng xác nhận → đã nộp; có thể hủy bản nháp trước khi nộp. Không tính bản nháp vào hạn ngạch giấy đã cấp.

Mở lại trang/tab lấy lại bản nháp từ backend. Phản hồi bổ sung và xác nhận luôn cập nhật đúng draft/request ID. Chỉ tạo công việc mới khi người dùng chủ động chọn thủ tục mới; nếu đang có bản nháp cùng loại, ưu tiên tiếp tục bản nháp đó.

Thêm kiểm soát phiên bản và khóa chống gửi lặp: click hai lần, retry HTTP hoặc HTTP/Socket gửi trùng không tạo hai đơn. Cập nhật từ một phiên bản cũ yêu cầu đồng bộ lại trước khi xác nhận.

## 3. Sidebar, biểu mẫu và phần bổ sung

- Hành động chính ở sidebar: AI chuẩn bị hồ sơ. Hành động phụ: xem/chỉnh sửa thông tin và tư vấn thủ tục.
- Chọn thủ tục truyền trực tiếp loại đơn có cấu trúc; không buộc AI suy đoán lại từ câu nhắn mẫu.
- Form ban đầu và form bổ sung dùng cùng định nghĩa trường theo từng thủ tục.
- Backend trả trường thiếu/không hợp lệ, giá trị hiện có và lựa chọn phù hợp. UI chỉ hiện phần cần nhập.
- Vay vốn bổ sung đủ các trường đặc thù; tình trạng mồ côi dùng lựa chọn, số lần/tiền dùng ô số. Không tự gán 0 cho dữ kiện chưa biết.
- Khi có dữ liệu tin cậy, lịch sử cấp giấy do trường quản lý được lấy từ backend; dữ liệu giải ngân cần nguồn phù hợp hoặc sinh viên cung cấp.
- Giấy xác nhận chung dùng lựa chọn mục đích nhanh; chỉ nhập text khi mục đích chưa có trong lựa chọn.
- Gom phần thiếu có thể xác định cùng lúc vào một lượt bổ sung.

## 4. Agent điều phối công việc và hành động có cấu trúc

Tách xử lý thành chuẩn bị bản nháp, thu thập dữ kiện và thực thi khi đã được xác nhận. Với thủ tục đã chọn và payload rõ ràng, dùng workflow trực tiếp; LLM phục vụ hiểu yêu cầu tự do, trích xuất phần người dùng bổ sung và giải thích khi cần.

Các công cụ tạo/xử lý đơn từ hội thoại cũng phải đi qua cơ chế bản nháp/xác nhận, tránh một công cụ cũ vô tình nộp đơn trước khi người dùng xác nhận. Luồng Verify/benchmark nội bộ có hợp đồng riêng, không mở đường bỏ qua xác nhận cho phiên sinh viên.

Backend trả các hành động được phép như chọn cơ sở, sửa dữ liệu, chuyển biểu mẫu phù hợp, xác nhận nộp, hủy. Nút gửi action ID, draft/request ID và phiên bản; không gửi một câu chat để LLM đoán hành động.

Nếu sinh viên trả lời bằng text, agent hiểu câu đó theo hành động đang chờ và tiếp tục đúng công việc. Trong các trường hợp xác nhận quan trọng có nội dung cụ thể như NVQS, ưu tiên nút có nhãn và nội dung hiển thị rõ; không suy ra cam kết từ câu trả lời mơ hồ hoặc tự đặt cờ đồng ý bằng LLM.

Danh sách yêu cầu bổ sung hiển thị trực tiếp từ kết quả backend, không để LLM bổ sung trường bắt buộc ngoài kết quả kiểm tra.

## 5. Một lần xác nhận cuối

Trước khi nộp, hiển thị tóm tắt đúng loại giấy, dữ liệu cho đơn và nơi nhận; có nút xác nhận nộp, chỉnh sửa, hủy. NVQS hiển thị địa chỉ và nội dung cam kết trong cùng bản xác nhận.

Máy chủ lưu xác nhận theo phiên bản nội dung. Địa chỉ bị sửa làm mất hiệu lực xác nhận địa chỉ cũ. Sau xác nhận, chạy policy hiện có đến kết quả tự duyệt, từ chối theo quy tắc hoặc chuyển cán bộ.

Điều kiện có thể thay đổi giữa lúc chuẩn bị và nộp được kiểm tra lại tại transaction. Nếu phát sinh thiếu/mâu thuẫn thật, tiếp tục cùng hồ sơ và chỉ yêu cầu phần mới cần giải quyết.

## 6. Giảm thao tác phía phòng ban

Hồ sơ ngoại lệ tự kèm tóm tắt, dữ kiện, kết quả kiểm tra, lý do chuyển và quyết định cần cán bộ đưa ra.

Các thao tác: phê duyệt, từ chối, yêu cầu bổ sung và chuyển cấp trong thẩm quyền. Duyệt không bắt gõ ghi chú. Từ chối/yêu cầu bổ sung có lựa chọn lý do hoặc trường cần bổ sung; mục khác cho phép nhập nội dung riêng. Lý do vẫn được lưu vào hồ sơ và audit.

Hồ sơ đã chuyển cán bộ mà được yêu cầu bổ sung phải bảo toàn ngữ cảnh và thẩm quyền. Bổ sung thông tin không được tự xóa yêu cầu con người duyệt hoặc mở đường vượt quy tắc.

## 7. Cập nhật trạng thái và phục hồi kết nối

Phát sự kiện sau khi transaction thành công tới đúng người dùng/phòng ban được phép. UI cập nhật công việc đang mở, danh sách hồ sơ và hàng đợi cán bộ. Reconnect tải lại trạng thái từ backend để bù sự kiện bị lỡ.

Phản hồi HTTP và Socket dùng cùng hợp đồng dữ liệu, cùng validation và workflow. Luôn kiểm tra business success; HTTP 200 không mặc nhiên là thao tác thành công.

## 8. Kiểm chứng và bàn giao local

Giữ các kiểm tra policy, quyền truy cập, hạn ngạch và audit. Điều chỉnh các kiểm thử đang phản ánh yêu cầu cũ về bắt khai lại thông tin, và bổ sung kiểm thử theo hợp đồng mới:

1. Chọn từng loại trong 5 biểu mẫu; dữ liệu có sẵn không bị hỏi lại.
2. Đủ dữ liệu chỉ cần chọn thủ tục và xác nhận cuối; trước xác nhận không có đơn được duyệt.
3. Thiếu dữ liệu chỉ hiện đúng trường thiếu, nhận đủ trong một lượt khi có thể.
4. Bổ sung bằng chat hoặc nút giữ nguyên ID; gửi lặp không tạo đơn trùng.
5. NVQS xác nhận đúng phiên bản địa chỉ; sửa địa chỉ không dùng lại cam kết cũ.
6. Tải lại trang/đổi tab tiếp tục bản nháp; không lẫn công việc hoặc tài khoản.
7. Cán bộ xử lý bằng lựa chọn có cấu trúc; sinh viên thấy cập nhật trạng thái.
8. Tư vấn/chào hỏi không tự tạo đơn; các trường hợp ngoại lệ vẫn giữ đúng thẩm quyền.
9. Chạy unit, kiểm tra frontend, build và integration trên PostgreSQL thử; test với AI thật sau khi có cấu hình.

Frontend build thành `dist` và phục vụ qua Vite preview trên máy, không chạy dev server. Backend chạy `NODE_ENV=production` bằng launcher local, dùng PostgreSQL và khóa AI trong `backend/.env` theo lựa chọn đã xác nhận của người dùng.

Địa chỉ dự kiến khi bàn giao: frontend `http://localhost:8080`, backend/health `http://localhost:5000/health`; điều chỉnh nếu cổng đã bị dùng. Frontend và Socket trỏ tới backend local ngay lúc build. Có hướng dẫn khởi động/dừng và bộ kịch bản người dùng tự test. Seed chỉ áp dụng DB local mới để có tài khoản và dữ liệu demo.

Kiểm thử click UI tự động chỉ thực hiện được khi phiên công cụ có browser khả dụng; nếu vẫn không có, ghi rõ giới hạn và bàn giao checklist để người dùng test trên trình duyệt.

## Cấu hình cần chốt

- Mặc định đề xuất: PostgreSQL riêng bằng Docker, dữ liệu demo phục vụ test; không dùng Supabase demo chung.
- Máy có Docker CLI nhưng Docker engine chưa hoạt động. Khi bắt đầu dựng local sẽ thử khởi động; nếu cần thao tác trên máy từ người dùng thì báo đúng bước còn thiếu.
- Workspace và biến môi trường hiện chưa có cấu hình DB hoặc khóa AI thật. Với DB Docker, có thể tự tạo URL và JWT local. Người dùng chỉ cần đặt khóa nhà cung cấp AI vào file `.env` bị gitignore hoặc chỉ đường dẫn file cấu hình sẵn có; không cần gửi giá trị khóa trong chat.
- Nếu muốn dùng Supabase thay cho Docker PostgreSQL, cần URL tới database/branch dành riêng cho local/test.

## Ranh giới phạm vi

Giữ các quy tắc tự duyệt và phạm vi 5 biểu mẫu hiện có. Thay đổi trải nghiệm thu thập dữ kiện, điều phối và xác nhận; không tự nới điều kiện duyệt hay thay đổi quyền của cán bộ. Thông tin người dùng sửa cho bản nháp không tự cập nhật vào dữ liệu gốc của trường.

Đã triển khai và chạy local để người dùng thử. Kiểm thử cuối đạt 161 ca backend và 24 ca frontend; kiểm thử API local trên DB/AI thật đã qua 5 biểu mẫu, gửi trùng, phục hồi, HITL và realtime. Chưa deploy bản sửa lên demo công khai.
