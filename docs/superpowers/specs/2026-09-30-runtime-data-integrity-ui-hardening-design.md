# Thiết kế loại bỏ mock runtime và củng cố UI/UX nhánh tuyển dụng

Ngày: 2026-09-30

Trạng thái: Chờ review tài liệu

Nhánh mục tiêu: `feature/recruitment-pipeline`

## 1. Bối cảnh

Nhánh hiện tại đã có pipeline tuyển dụng, Candidate Portal, CV Studio, phòng phỏng vấn, scorecard và kho biên bản. Working tree còn chứa một đợt phát triển lớn cho candidate discovery, CV cá nhân, đánh giá phỏng vấn và đồng bộ dữ liệu meeting.

Audit hiện trạng phát hiện ba nhóm dữ liệu thường bị gọi chung là “mock”:

1. Dữ liệu giả được render trong ứng dụng thật, như capacity/mandate phòng ban, Member Knowledge, CV mẫu và quick-login.
2. Fallback backend tạo ra bản ghi hoặc kết quả không có nguồn thật, như task tổng hợp tự sinh và kết quả Knowledge Search mặc định.
3. Fixture và seed chủ động phục vụ kiểm thử hoặc khởi tạo môi trường.

Thiết kế này loại bỏ nhóm 1 và 2 khỏi runtime. Fixture kiểm thử và seed script chỉ chạy khi được gọi chủ động vẫn được giữ lại.

## 2. Mục tiêu

- Mọi dữ liệu nghiệp vụ xuất hiện trong UI production phải truy được về API, database hoặc dữ liệu người dùng vừa nhập.
- Khi chưa có dữ liệu thật, UI hiển thị loading, empty hoặc error state; không lấp khoảng trống bằng bản ghi mẫu.
- Candidate Portal, Recruitment, Interview Scorecard, Meeting Archive và CV Vault có hierarchy rõ ràng, responsive và không gây layout shift.
- Các file được sửa trong đợt này không còn lỗi ESLint; TypeScript và các test tuyển dụng liên quan phải đạt.
- Không ghi đè hoặc xoá các thay đổi chưa commit không liên quan trong working tree.

## 3. Định nghĩa phạm vi mock runtime

Một giá trị bị coi là mock runtime khi thỏa ít nhất một điều kiện:

- Đại diện cho người, tổ chức, CV, cuộc họp, nhiệm vụ, thống kê hoặc kết quả tìm kiếm không tồn tại trong nguồn dữ liệu thật.
- Được tự động đưa vào state hoặc local storage để màn hình trông có dữ liệu.
- Được backend tự sinh và lưu như một kết quả nghiệp vụ dù không có bằng chứng đầu vào.
- Cung cấp credential demo hoặc cơ chế xác thực nới lỏng trong luồng đăng nhập bình thường.

Các nội dung sau không thuộc phạm vi xoá:

- Placeholder hướng dẫn nhập liệu trong form.
- Ảnh preview của template CV, icon, illustration và asset trang trí.
- Giá trị cấu hình kỹ thuật an toàn, như trạng thái mặc định `TODO` cho task mới do người dùng tạo.
- Fixture trong test và seed script chỉ chạy chủ động.

## 4. Thiết kế nguồn dữ liệu thật

### 4.1. Đăng nhập

- Xoá `AuthQuickAccess` khỏi trang đăng nhập production.
- Xoá fallback cho phép dùng chéo hai mật khẩu demo trong `verify_password`; chỉ bcrypt hash tương ứng mới hợp lệ.
- Giữ seed account trong script khởi tạo để môi trường local có thể được dựng chủ động. Seed không được tự động biến thành bypass xác thực.

### 4.2. Admin policies và kiểu dữ liệu quản trị

`mockAdminData.ts` hiện vừa chứa type vừa chứa bản ghi mẫu. Hai trách nhiệm này phải được tách:

- Di chuyển type còn được dùng sang module type trung lập.
- Không khởi tạo policy bằng `MOCK_POLICIES`.
- Vì repo chưa có API persistence cho protocol policy, màn hình phải hiển thị trạng thái “chưa cấu hình trên máy chủ” và vô hiệu hoá hành động lưu thay vì giả vờ đã lưu thành công.
- Xoá file mock sau khi không còn import runtime.

Không mở rộng phạm vi sang xây dựng một subsystem policy persistence mới trong đợt này.

### 4.3. Capacity và executive mandate của phòng ban

- Xoá `MOCK_DEPARTMENTS_CAPACITY`, `MOCK_EXECUTIVE_MANDATES` và cơ chế tự seed local storage.
- Dùng `DepartmentProgressItem`, danh sách department, member count và Jira issue count hiện có để dựng tổng quan thật.
- Không suy diễn giờ làm việc, mức tải hoặc mandate nếu backend không cung cấp dữ liệu tương ứng. Các KPI không có nguồn sẽ bị bỏ khỏi UI.
- Capacity tab được đổi thành tổng quan tiến độ và khối lượng công việc: tổng task, hoàn thành, đang thực hiện, chưa bắt đầu và tỷ lệ hoàn thành.
- Khi API trả mảng rỗng, hiển thị empty state có nút làm mới hoặc tạo phòng ban phù hợp quyền hiện tại.
- Ngừng đọc/ghi các key local storage mandate/task cũ. Dữ liệu cũ còn trong trình duyệt không được dùng để render hoặc gửi lên server.

### 4.4. Knowledge và transcript search

- `MemberKnowledgeTab` không giữ `SAMPLE_KNOWLEDGE_BASE`.
- UI lấy danh sách meeting/transcript hoặc dùng endpoint Knowledge Search thật.
- Backend search phải truy vấn nội dung transcript thật và metadata tài liệu thật trong phạm vi organization.
- Không thêm “system result” khi không có match. Kết quả rỗng là kết quả hợp lệ.
- Snippet phải được cắt từ nội dung thật quanh vị trí match; không dùng câu mô tả chung giả lập semantic search.
- Search error hiển thị inline và cho phép thử lại; không biến lỗi thành danh sách mẫu.

### 4.5. Meeting transcript và task extraction

- Payload transcript do người dùng/API gửi không được gắn `is_mock: true`; nguồn được biểu diễn bằng metadata trung lập như `source: "manual"` nếu client cần phân biệt.
- Khôi phục kiểm tra quyền meeting phù hợp thay vì tự thêm bất kỳ user xác thực nào thành participant chỉ để hỗ trợ script.
- Nếu transcript, chat và agenda không tạo được task, endpoint trả danh sách rỗng hoặc các task đã tồn tại.
- Xoá nhánh tự sinh task, tên người mẫu, email mẫu và deadline giả.
- UI dùng empty state “Chưa phát hiện nhiệm vụ có đủ bằng chứng” và cho phép người có quyền tạo task thủ công.

### 4.6. Candidate discovery và CV Studio

- Xoá `PRESET_CVS` và các nút điền CV mẫu một chạm.
- Xoá `SAMPLE_HARVARD_CV` khỏi state khởi tạo runtime.
- Tạo factory `createEmptyCVData(user)` chỉ điền các trường có nguồn từ tài khoản hiện tại, như họ tên và email; phần kinh nghiệm, kỹ năng, dự án, chứng chỉ và thành tích bắt đầu rỗng.
- Khi mở resume đã lưu, dữ liệu luôn lấy từ Saved Resume API.
- Template metadata và ảnh preview được giữ vì đây là asset lựa chọn giao diện, không phải hồ sơ ứng viên giả.
- Quick Scan bắt đầu bằng textarea rỗng và target role rỗng hoặc lấy từ job opening đang chọn.
- AI review chỉ hiển thị kết quả API thật. Lỗi model/API không sinh score hoặc nhận xét thay thế.

### 4.7. Recruitment và interview scorecard

- Job opening, application, session, rubric, transcript và evaluation đều lấy từ API hiện có.
- Không hiển thị score mặc định khi chưa có evaluation.
- Thiếu rubric, transcript hoặc evaluation phải có empty state riêng để người dùng biết bước nào chưa hoàn tất.
- Owner và Manager dùng cùng component trình bày session/scorecard nhằm tránh copy hai khối UI gần giống nhau.

## 5. Thiết kế UI/UX

### 5.1. Candidate navigation

- Active tab được xác định từ cả pathname và query `tab`, không chỉ pathname.
- Desktop dùng ba trigger có chiều rộng cố định; label được `truncate` và có `title`.
- Mobile dùng vùng tab cuộn ngang với kích thước item ổn định, không ép text làm rộng header.
- Chỉ hiển thị avatar/account menu khi có user thật; trạng thái chưa đăng nhập có CTA đăng nhập rõ ràng.

### 5.2. Visual hierarchy

- Giữ nền slate và blue làm accent chính của workspace.
- Amber chỉ biểu diễn pending/warning; emerald biểu diễn hoàn tất; rose biểu diễn lỗi/từ chối.
- Không dùng purple như một accent hành động thứ hai cho interview. Interview vẫn phân biệt bằng icon và label, không bằng một hệ màu tách biệt.
- Heading dùng sentence case, label hành động ngắn và cụ thể.

### 5.3. Trigger và layout stability

Mọi select, filter, tab hoặc nút có nhãn động phải:

- Có `shrink-0` và chiều rộng cố định phù hợp breakpoint.
- Bọc text bằng `truncate`.
- Có `title` chứa nhãn đầy đủ.
- Chỉ hiển thị badge đếm nếu chiều rộng đã dự trù.

Các nhóm filter của Archive và Candidate không thay đổi chiều rộng khi count hoặc label thay đổi. Card không đổi chiều cao đột ngột giữa loading và loaded state; skeleton phải gần với kích thước nội dung thật.

### 5.4. Trạng thái giao diện

Mỗi vùng gọi API phải có bốn trạng thái phân biệt:

- Loading: skeleton đúng hình dạng nội dung.
- Empty: giải thích ngắn gọn và CTA phù hợp quyền.
- Error: thông báo inline, không dùng `alert`, có retry khi an toàn.
- Success: nội dung thật và feedback không phô trương.

Modal scorecard, apply form và CV Studio phải giữ focus ring, đóng bằng Escape khi component nền hỗ trợ, có nút đóng được gắn accessible label và không vượt viewport trên màn hình nhỏ.

### 5.5. Phân rã component có kiểm soát

Các file mới rất lớn sẽ chỉ được tách tại seam phục vụ trực tiếp cho thay đổi:

- Candidate discovery: tab jobs, CV review, applications và apply dialog.
- Recruitment: shared interview session panel.
- CV Studio: empty-data factory và các panel có state độc lập nếu cần để xử lý lint/UX.

Không thực hiện rewrite toàn bộ design system hoặc các màn hình không liên quan.

## 6. Quyền và test tuyển dụng

Fixture E2E hiện tạo Manager được chọn làm HR nhưng không cấp direct grant `recruitment.review`, khiến 9 test dừng ở bước tạo opening. Fixture phải phản ánh đúng domain model:

- Manager thường không tự có quyền review.
- Manager được chọn làm HR trong fixture phải nhận grant trực tiếp.
- Test thiếu quyền vẫn dùng một Manager khác hoặc thu hồi grant để xác minh `403/400` tương ứng.

Không nới lỏng production permission check chỉ để test qua.

## 7. Xử lý lỗi và tính nhất quán

- Chuẩn hoá helper lấy message từ `unknown` thay cho `catch (err: any)` trong các file được sửa.
- Request cũ phải được bỏ qua hoặc huỷ khi search/filter mới bắt đầu để tránh dữ liệu về sai thứ tự.
- Không gọi setState đồng bộ qua wrapper từ effect theo pattern bị React lint cảnh báo; effect khởi tạo dùng callback async có cleanup hoặc dữ liệu được fetch tại ranh giới phù hợp.
- Reconnect callback của meeting events phải dùng ref/callback ổn định, tránh tham chiếu hàm trước khi khai báo.
- Mọi action tạo/cập nhật phải khoá nút trong lúc submit và không tạo request trùng.

## 8. Kiểm thử và xác minh

### Backend

- Test Knowledge Search trả match transcript thật.
- Test Knowledge Search trả mảng rỗng khi không có match.
- Test task extraction không tạo task khi không có evidence.
- Test user ngoài meeting không thể tự thêm transcript.
- Chạy hai suite Candidate Discovery và Recruitment E2E; tất cả test phải đạt.

### Frontend

- TypeScript: `tsc --noEmit`.
- ESLint trên toàn bộ file được sửa/mới trong phạm vi; không còn error.
- Kiểm tra thủ công các state loading/empty/error của Candidate, CV Vault, Recruitment, Scorecard, Archive, Departments và Knowledge.
- Kiểm tra active tab Candidate bằng cả URL trực tiếp và click navigation.
- Kiểm tra trigger không đổi chiều rộng khi label/count thay đổi.

### Repository và runtime

- `git diff --check` không còn whitespace error trong các file phạm vi.
- Build frontend production thành công.
- Theo `AGENTS.md`, sau mọi thay đổi frontend phải chạy từ project root:

```bash
docker compose up -d --build frontend
```

- Sau khi container healthy, người dùng có thể refresh `http://localhost:3001`.

## 9. Thứ tự triển khai

1. Thêm test khóa hành vi dữ liệu thật và sửa fixture permission.
2. Xoá fallback backend tạo dữ liệu giả; sửa Knowledge Search và meeting authorization.
3. Tách type khỏi mock module; thay Admin/Knowledge bằng dữ liệu thật và empty state.
4. Chuyển CV Studio/Quick Scan sang dữ liệu rỗng hoặc dữ liệu tài khoản thật.
5. Chuẩn hoá Candidate navigation, Recruitment session panel, Scorecard, Archive và các trigger động.
6. Sửa lint trong toàn bộ file đã đụng tới, chạy test/build và rebuild Docker frontend.

## 10. Ngoài phạm vi

- Xây mới backend persistence cho protocol policy hoặc executive mandate.
- Xoá fixture test hoặc seed script chủ động.
- Xoá dữ liệu đang tồn tại trong database của người dùng.
- Rewrite toàn bộ frontend hoặc xử lý toàn bộ lỗi lint legacy không nằm trong file được sửa.
- Thay đổi framework, thư viện UI hoặc mô hình phân quyền đã duyệt của recruitment.

## 11. Tiêu chí chấp nhận

Đợt thay đổi hoàn tất khi:

- Không còn import hoặc runtime use của `mockAdminData`, `MOCK_*`, `SAMPLE_KNOWLEDGE_BASE`, `PRESET_CVS` hay `SAMPLE_HARVARD_CV`.
- Đăng nhập không hiển thị credential demo và không có password bypass.
- Knowledge không trả kết quả giả; task extraction không tạo task thiếu evidence.
- Candidate/CV/Recruitment/Interview/Archive hiển thị loading, empty và error state đúng nguồn dữ liệu.
- Trigger động trong các màn hình sửa đổi tuân thủ fixed width, `truncate` và `title`.
- Recruitment E2E và Candidate Discovery test đạt; TypeScript và frontend build đạt.
- ESLint không còn error trong tập file được sửa.
- Docker frontend được rebuild và trang `http://localhost:3001` sẵn sàng refresh.
