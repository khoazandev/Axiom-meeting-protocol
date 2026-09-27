# Axiom Meeting Protocol

Axiom là không gian cộng tác theo tổ chức, kết hợp cuộc họp, tri thức sau cuộc họp và quy trình tuyển dụng có kiểm soát. Tài liệu này thống nhất ngôn ngữ domain để sản phẩm, API và dữ liệu không dùng lẫn các khái niệm.

## Tổ chức và con người

**Organization**:
Không gian doanh nghiệp cô lập dữ liệu, thành viên, phòng ban và quy trình tuyển dụng của một công ty.
_Avoid_: Company, workspace, tenant

**User**:
Tài khoản đã đăng ký có thể đăng nhập vào Axiom; một User chỉ trở thành nhân sự của Organization khi có Organization Membership.
_Avoid_: Employee, candidate, account holder

**Organization Membership**:
Quan hệ đang có hiệu lực giữa một User và một Organization, kèm vai trò và phạm vi phòng ban.
_Avoid_: User role, employee record

**Department**:
Đơn vị chuyên môn thuộc một Organization và là phạm vi tuyển dụng, quản lý nhân sự của Manager.
_Avoid_: Team, group, division

**Owner**:
Thành viên chịu trách nhiệm cao nhất của Organization và có quyền phê duyệt cuối cùng việc tiếp nhận ứng viên.
_Avoid_: Super admin, recruiter

**HR Manager**:
Một Manager được giao quyền đánh giá tuyển dụng cho phòng ban mình quản lý; đây là năng lực bổ sung, không phải một vai trò tổ chức riêng.
_Avoid_: HR role, recruiter role, global HR

## Tuyển dụng

**Candidate**:
Người đang tham gia tuyển dụng nhưng chưa phải User hay thành viên của Organization.
_Avoid_: Employee, member, applicant user

**Job Opening**:
Nhu cầu tuyển một vị trí cụ thể cho một Department, có tiêu chí đánh giá và HR Manager phụ trách.
_Avoid_: Job, vacancy, campaign

**Recruitment Application**:
Hồ sơ liên kết một Candidate với một Job Opening và ghi nhận toàn bộ hành trình tuyển dụng của người đó.
_Avoid_: Candidate, CV, application form

**Recruitment Stage**:
Trạng thái nghiệp vụ hiện tại của Recruitment Application trong quy trình từ lời mời đến tiếp nhận hoặc từ chối.
_Avoid_: Step, status flag, round

**Assessment**:
Bài kiểm tra có phiên bản tiêu chí chấm điểm, được giao cho Candidate trong một Recruitment Application.
_Avoid_: Quiz, exam, test round

**Interview Session**:
Buổi phỏng vấn gắn với một Recruitment Application, có Candidate và những người đánh giá được chỉ định tham dự.
_Avoid_: Meeting, interview meeting, call

**AI Evaluation**:
Nhận định sơ bộ có dẫn chứng về bài kiểm tra hoặc buổi phỏng vấn, dùng để hỗ trợ con người và không có quyền ra quyết định tuyển dụng.
_Avoid_: AI decision, auto-rejection, candidate score

**HR Review**:
Đánh giá chuyên môn và khuyến nghị tuyển hoặc không tuyển do HR Manager phụ trách ghi nhận sau các vòng đánh giá.
_Avoid_: AI review, final approval, manager vote

**Owner Approval**:
Quyết định cuối cùng của Owner đối với Recruitment Application sau HR Review.
_Avoid_: HR approval, automatic approval, onboarding

**Onboarding Invitation**:
Lời mời tạo tài khoản hoặc gia nhập Organization chỉ được phát hành sau Owner Approval.
_Avoid_: Candidate invitation, interview invitation, recruitment invite
