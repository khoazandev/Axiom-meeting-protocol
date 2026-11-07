# Thiết kế phân hệ tuyển dụng có AI hỗ trợ

Ngày: 2026-09-27

Trạng thái: Chờ review
Phạm vi: MVP tuyển dụng nội bộ cho từng phòng ban

## 1. Mục tiêu

Bổ sung một phân hệ tuyển dụng tách biệt khỏi luồng mời thành viên hiện tại. Owner tạo nhu cầu tuyển và mời ứng viên; ứng viên làm bài kiểm tra, tham gia phỏng vấn; AI đưa đánh giá sơ bộ có dẫn chứng; HR Manager phụ trách phòng ban đưa khuyến nghị chuyên môn; Owner phê duyệt cuối cùng trước khi hệ thống phát hành lời mời onboarding.

Thiết kế phải bảo đảm ba nguyên tắc:

1. Ứng viên chưa phải User hoặc Organization Member trong thời gian tuyển dụng.
2. AI là công cụ hỗ trợ, không được tự động nhận hoặc loại ứng viên.
3. HR Manager chỉ xem và đánh giá hồ sơ thuộc phòng ban mình được giao phụ trách.

## 2. Phạm vi vai trò và quyền

Không tạo role `HR` mới. Một HR Manager vẫn có role `MANAGER`, đồng thời phải thỏa cả ba điều kiện:

- Có permission `recruitment.review`.
- Thuộc đúng Department của Job Opening.
- Được chỉ định làm reviewer của Job Opening hoặc Recruitment Application.

Permission không tự mở quyền đọc toàn bộ ứng viên trong công ty. Ràng buộc phòng ban và việc được chỉ định vẫn bắt buộc.

RBAC hiện tại của dự án chỉ gắn permission theo role. Vì chỉ một số Manager làm HR, phân hệ này cần bổ sung grant theo từng Organization Membership, ví dụ `OrganizationMemberPermission`. Quyền hiệu lực là quyền nền từ role cộng với grant trực tiếp của membership. `recruitment.review` không được thêm vào bộ quyền nền của role `MANAGER`; Owner cấp hoặc thu hồi grant này cho từng Manager.

`recruitment.approve` chỉ thuộc Owner. Không đưa permission này vào nhóm quyền tự động dùng chung cho `ADMIN`, dù seed hiện tại đang cấp toàn bộ `ALL_PERMISSIONS` cho cả Owner và Admin; danh sách quyền tuyển dụng phải được seed tường minh theo từng role.

Owner có các quyền tuyển dụng cấp tổ chức:

- `recruitment.manage`: tạo, sửa, đóng Job Opening và mời Candidate.
- `recruitment.read_all`: xem mọi hồ sơ tuyển dụng trong Organization.
- `recruitment.approve`: phê duyệt hoặc từ chối cuối cùng.

HR Manager cần:

- `recruitment.review`: xem hồ sơ được giao trong phòng ban mình và ghi nhận quyết định chuyên môn.

Quy tắc phân quyền phải được kiểm tra ở backend trên mọi endpoint; ẩn nút ở frontend chỉ là hỗ trợ trải nghiệm.

## 3. Mô hình domain

### 3.1. Job Opening

Đại diện nhu cầu tuyển của một Department, gồm:

- Organization và Department đích.
- Tên vị trí, mô tả, số lượng cần tuyển.
- Bộ tiêu chí năng lực có phiên bản.
- Một HR Manager phụ trách; đổi người phụ trách phải được audit.
- Trạng thái `DRAFT`, `OPEN`, `CLOSED`, `ARCHIVED`.

### 3.2. Candidate

Lưu thông tin tối thiểu phục vụ tuyển dụng: họ tên, email, số điện thoại tùy chọn và thông tin đồng thuận. Candidate là dữ liệu riêng của từng Organization và không liên kết bắt buộc với User.

Email trùng với một User hiện có không tự động cấp quyền vào Organization. Quan hệ thành viên chỉ được tạo qua Onboarding Invitation sau khi được duyệt.

### 3.3. Recruitment Application

Liên kết một Candidate với một Job Opening và là aggregate root của quy trình. Hồ sơ giữ:

- Recruitment Stage hiện tại và `version` để chống cập nhật đồng thời.
- HR Manager được giao, mặc định kế thừa từ Job Opening và có thể được Owner tái phân công.
- Assessment attempts.
- Interview Sessions.
- AI Evaluations.
- HR Review.
- Owner Approval.
- Dòng thời gian sự kiện và audit metadata.

Một Candidate có thể ứng tuyển nhiều Job Opening, nhưng chỉ có một hồ sơ đang hoạt động cho cùng một Job Opening.

### 3.4. Assessment

Assessment Definition giữ bộ câu hỏi, đáp án/chỉ dẫn chấm và rubric có phiên bản. Assessment Attempt giữ snapshot của phiên bản đã giao, thời điểm bắt đầu/nộp, câu trả lời và kết quả.

Snapshot bảo đảm việc sửa bộ câu hỏi sau này không làm thay đổi lịch sử ứng viên đã hoàn thành.

### 3.5. Interview Session

Liên kết Recruitment Application với Meeting hiện có thay vì tạo một hệ thống gọi video thứ hai. Interview Session bổ sung ngữ nghĩa tuyển dụng: vòng phỏng vấn, interviewer được chỉ định, rubric, trạng thái đồng thuận ghi âm/phân tích và liên kết tới transcript.

Candidate tham gia bằng guest token có thời hạn, dùng một lần hoặc giới hạn phiên, chỉ có quyền vào đúng phòng phỏng vấn. Guest token không cấp quyền xem dữ liệu Organization, danh sách meeting khác hoặc API nội bộ.

### 3.6. AI Evaluation

AI Evaluation là báo cáo bất biến theo từng lần chạy, gồm:

- Phiên bản model, prompt và rubric.
- Điểm theo từng năng lực, confidence và giải thích.
- Dẫn chứng tới câu trả lời hoặc timestamp trong transcript.
- Điểm còn thiếu, rủi ro và câu hỏi gợi ý hỏi thêm.
- Trạng thái `PENDING`, `COMPLETED`, `FAILED`.

Không dùng suy luận cảm xúc, khuôn mặt, giới tính, tuổi, sắc tộc, khuyết tật hoặc thuộc tính nhạy cảm. Kết quả AI không tự chuyển hồ sơ sang `APPROVED` hoặc `REJECTED`.

### 3.7. Human decisions

HR Review lưu nhận xét, đánh giá theo rubric, quyết định chuyên môn `HIRE`, `NO_HIRE` hoặc `NEEDS_MORE_EVIDENCE`, và lý do nếu khác với nhận định AI.

Owner Approval lưu quyết định `APPROVED` hoặc `REJECTED`, ghi chú và người thực hiện. Owner có thể khác khuyến nghị HR nhưng phải ghi lý do để audit.

## 4. Luồng trạng thái

Luồng chuẩn:

```text
INVITED
  -> ASSESSMENT_PENDING
  -> ASSESSMENT_SUBMITTED
  -> INTERVIEW_SCHEDULED
  -> INTERVIEW_COMPLETED
  -> HR_REVIEW_PENDING
       |-- NO_HIRE -------------> REJECTED
       |-- NEEDS_MORE_EVIDENCE -> ASSESSMENT_PENDING hoặc INTERVIEW_SCHEDULED
       `-- HIRE ----------------> OWNER_APPROVAL_PENDING
                                      |-- REJECTED
                                      `-- APPROVED
                                            -> ONBOARDING_INVITED
                                            -> HIRED
```

Các nhánh kết thúc:

- `REJECTED`: do HR Manager quyết định `NO_HIRE` hoặc Owner từ chối phê duyệt; hồ sơ phải lưu nguồn quyết định.
- `WITHDRAWN`: Candidate chủ động dừng.
- `EXPIRED`: lời mời tuyển dụng hết hạn trước khi Candidate bắt đầu.
- `CANCELLED`: Owner đóng hồ sơ vì lý do vận hành.

Quy tắc chuyển trạng thái:

- Mọi chuyển trạng thái đi qua một workflow service duy nhất và được audit.
- Không được bỏ qua HR Review để tới Owner Approval trong MVP.
- HR Review `HIRE` chuyển hồ sơ sang `OWNER_APPROVAL_PENDING`; `NO_HIRE` kết thúc ở `REJECTED` và không cần Owner phê duyệt; `NEEDS_MORE_EVIDENCE` phải tạo thêm Assessment hoặc Interview Session trước khi review lại.
- Assessment có thể được bỏ qua nếu Job Opening được cấu hình không cần bài kiểm tra; workflow vẫn ghi sự kiện bỏ qua có lý do.
- AI Evaluation thất bại không khóa HR Review; giao diện hiển thị rõ trạng thái thất bại và cho phép chạy lại.
- `APPROVED` chưa đồng nghĩa đã là nhân viên. Chỉ `HIRED` sau khi onboarding hoàn tất mới tạo Organization Membership hoạt động.
- Chuyển trạng thái không hợp lệ trả HTTP `409 Conflict`.

## 5. Ranh giới module và giao diện chính

Phân hệ tuyển dụng là một module độc lập, dùng Meeting và Organization Invitation qua các giao diện hẹp.

### RecruitmentWorkflow

```text
advance(application_id, command, actor, expected_version) -> ApplicationSnapshot
```

Chịu trách nhiệm kiểm tra trạng thái, quyền, phạm vi phòng ban, optimistic locking và ghi audit event. Controller không tự sửa stage.

### AssessmentService

```text
assign(application_id, assessment_definition_id, actor) -> AssessmentAttempt
submit(attempt_id, candidate_session, answers) -> AssessmentAttempt
```

Chịu trách nhiệm snapshot đề, thời hạn, giới hạn số lần nộp và tính toàn vẹn câu trả lời.

### InterviewService

```text
schedule(application_id, schedule, interviewers, actor) -> InterviewSession
issue_guest_access(interview_session_id, candidate_session) -> GuestMeetingAccess
complete(interview_session_id, actor) -> InterviewSession
```

Chịu trách nhiệm liên kết Meeting, quyền interviewer và guest access; không sao chép logic media/transcript.

### CandidateEvaluator

```text
evaluate(application_id, source_refs, rubric_version) -> EvaluationRun
```

Đây là seam tới nhà cung cấp AI. Adapter thật và adapter giả trong test phải cùng tuân một contract; workflow chỉ đọc báo cáo đã chuẩn hóa.

### OnboardingService

```text
issue_invitation(application_id, actor, idempotency_key) -> OrganizationInvitation
complete_membership(application_id, user_id) -> OrganizationMembership
```

Chỉ chấp nhận hồ sơ đã `APPROVED`. Mỗi Recruitment Application chỉ tạo tối đa một Organization Invitation đang hiệu lực; retry không sinh lời mời trùng.

## 6. API đề xuất

API cho Owner và HR Manager nằm dưới Organization để giữ tenant boundary:

```text
POST   /api/v1/organizations/{org_id}/recruitment/openings
GET    /api/v1/organizations/{org_id}/recruitment/openings
POST   /api/v1/organizations/{org_id}/recruitment/applications
GET    /api/v1/organizations/{org_id}/recruitment/applications
GET    /api/v1/organizations/{org_id}/recruitment/applications/{application_id}
POST   /api/v1/organizations/{org_id}/recruitment/applications/{application_id}/assessment
POST   /api/v1/organizations/{org_id}/recruitment/applications/{application_id}/interviews
POST   /api/v1/organizations/{org_id}/recruitment/applications/{application_id}/hr-review
POST   /api/v1/organizations/{org_id}/recruitment/applications/{application_id}/owner-approval
POST   /api/v1/organizations/{org_id}/recruitment/applications/{application_id}/onboarding-invitation
```

Candidate dùng invitation token để đổi lấy candidate session ngắn hạn, không dùng employee JWT:

```text
POST   /api/v1/recruitment/invitations/{token}/session
GET    /api/v1/recruitment/applications/me
GET    /api/v1/recruitment/assessments/{attempt_id}
POST   /api/v1/recruitment/assessments/{attempt_id}/submit
POST   /api/v1/recruitment/interviews/{interview_session_id}/guest-access
POST   /api/v1/recruitment/applications/me/withdraw
```

Token thô không được lưu trong database; chỉ lưu hash, ngày hết hạn, số lần dùng và thời điểm thu hồi.

## 7. UI và trải nghiệm

### Owner

- Khu vực `Recruitment` trong quản trị Organization.
- Danh sách Job Opening và pipeline ứng viên theo stage.
- Tạo lời mời, theo dõi tiến độ, xem Assessment, transcript, AI Evaluation và HR Review.
- Màn phê duyệt cuối cùng bắt buộc xác nhận rõ trước khi tạo Onboarding Invitation.

### HR Manager

- Chỉ thấy mục `Recruitment` khi có `recruitment.review`.
- Chỉ thấy các Job Opening/hồ sơ đúng Department và được giao.
- Màn review đặt bằng chứng, rubric, AI Evaluation và transcript cạnh nhau; ý kiến AI được trình bày là tham khảo, không phải kết luận.

### Candidate

- Candidate portal tối giản, không dùng navigation nội bộ của nhân viên.
- Hiển thị timeline, thời hạn, bài kiểm tra, lịch phỏng vấn và trạng thái hồ sơ.
- Hiển thị và ghi nhận consent trước khi ghi âm, tạo transcript hoặc chạy AI Evaluation.

Các Select, filter, badge và trigger có nội dung động trong frontend phải tuân quy tắc khóa chiều rộng, `truncate` và `title` của dự án để tránh layout shift.

## 8. Audit, bảo mật và riêng tư

Mọi hành động quan trọng cần lưu actor, thời điểm, Organization, application, trạng thái trước/sau và request correlation ID:

- Tạo/sửa/đóng Job Opening.
- Mời Candidate, thu hồi hoặc phát hành lại token.
- Giao/nộp Assessment.
- Tạo guest access và hoàn tất Interview Session.
- Chạy/chạy lại AI Evaluation.
- HR Review và Owner Approval.
- Phát hành Onboarding Invitation và tạo Organization Membership.

Ngoài kiểm tra permission, mọi truy vấn phải lọc theo Organization trước khi tìm resource ID để tránh IDOR. Transcript, câu trả lời và báo cáo AI là dữ liệu nhạy cảm; quyền truy cập phải tối thiểu và có retention policy cấu hình được.

## 9. Xử lý lỗi và đồng thời

- Recruitment Application dùng `version` hoặc cơ chế optimistic locking; client gửi `expected_version` khi ra quyết định.
- Endpoint tạo lời mời, lên lịch và onboarding nhận idempotency key.
- Hai quyết định đồng thời: thao tác có version cũ nhận `409`, không ghi đè âm thầm.
- AI timeout/failure được lưu thành Evaluation Run thất bại, có retry; không làm mất nguồn đầu vào.
- Token hết hạn hoặc bị thu hồi trả lỗi chung, không tiết lộ Candidate có tồn tại hay không.
- Email gửi thất bại được retry riêng; trạng thái domain không được giả vờ là email đã gửi thành công.

## 10. Kiểm thử bắt buộc

### Domain và quyền

- Không thể chuyển stage sai thứ tự.
- Manager thiếu `recruitment.review` bị từ chối.
- Manager đúng permission nhưng sai Department bị từ chối.
- Manager đúng Department nhưng không phải HR Manager được giao bị từ chối.
- Resource của Organization khác không thể đọc bằng ID đoán được.
- Candidate không thể đọc hồ sơ của Candidate khác.

### Quyết định

- AI Evaluation không thể tạo HR Review hoặc Owner Approval.
- HR Manager có thể khác AI nếu ghi lý do.
- Owner có thể từ chối dù HR quyết định `HIRE` và phải ghi lý do.
- Không phát hành Onboarding Invitation trước Owner Approval.
- Retry onboarding chỉ tạo một lời mời hợp lệ.
- Candidate không trở thành Organization Member trước khi hoàn tất onboarding.

### Meeting và dữ liệu

- Guest token sai meeting, hết hạn hoặc đã thu hồi không dùng được.
- Interviewer không được giao không xem transcript tuyển dụng.
- Không chạy ghi âm/phân tích AI khi chưa có consent bắt buộc.
- AI Evaluation lưu đúng rubric/model/prompt version và evidence source.

### End-to-end

- Happy path từ lời mời tuyển dụng đến `HIRED`.
- Assessment được cấu hình bỏ qua.
- AI Evaluation thất bại nhưng HR và Owner vẫn hoàn tất quyết định.
- Candidate rút hồ sơ trước phỏng vấn.

## 11. Kế hoạch phát hành theo lát dọc

### Giai đoạn 0 — Điều kiện nền

- Củng cố kiểm tra tenant/RBAC cho Organization và Meeting.
- Chuẩn hóa room identity và guest access có thời hạn.
- Bổ sung audit trail nền tảng và secret/token handling.

### Giai đoạn 1 — Core recruitment và Assessment

- Job Opening, Candidate, Recruitment Application, workflow state machine.
- Permission tuyển dụng và giới hạn Department/reviewer.
- Candidate invitation/session và Assessment portal.

### Giai đoạn 2 — Interview

- Interview Session liên kết Meeting hiện tại.
- Lịch phỏng vấn, interviewer assignment, guest access, consent và transcript link.

### Giai đoạn 3 — AI Evaluation và HR Review

- Rubric có phiên bản, AI adapter, evidence-backed report.
- Màn review của HR Manager và audit khi khác nhận định AI.

### Giai đoạn 4 — Owner Approval và onboarding

- Phê duyệt cuối cùng, idempotent Organization Invitation.
- Chuyển Candidate thành User/Organization Member khi onboarding hoàn tất.
- E2E, retention và quan sát vận hành.

Mỗi giai đoạn phải có migration, API tests, permission tests và một luồng UI sử dụng được; không triển khai toàn bộ backend trước rồi mới nối frontend.

## 12. Ngoài phạm vi MVP

- Trang tuyển dụng công khai và hệ thống sourcing.
- Tự động đọc/ranking CV hàng loạt.
- Offer letter, ký điện tử, lương và payroll.
- Pipeline tùy biến vô hạn theo từng Job Opening.
- Talent pool dùng chung giữa nhiều Organization.
- Tự động loại ứng viên chỉ dựa trên AI.
- Phân tích cảm xúc, khuôn mặt hoặc thuộc tính nhạy cảm.

## 13. Tiêu chí chấp nhận kiến trúc

Thiết kế được coi là đạt khi:

- Không có đường đi nào biến Candidate thành Organization Member trước Owner Approval và onboarding.
- Một HR Manager không thể xem hoặc đánh giá ứng viên ngoài Department/phân công của mình.
- Mọi nhận định AI quan trọng có evidence và version metadata, nhưng không có quyền ra quyết định.
- Toàn bộ quyết định của HR và Owner được audit và chịu kiểm soát đồng thời.
- Interview tái sử dụng Meeting mà không làm lộ dữ liệu nội bộ cho Candidate.
- Luồng chính và các nhánh lỗi quan trọng có kiểm thử tự động.
