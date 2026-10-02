/**
 * Department Role Presets & Standard Enterprise Job Templates
 * Provides standardized roles, descriptions, requirements, and competency questions by department.
 */

import { QuestionItem } from '@/components/admin/CreateProfessionalJobModal';

export interface RolePreset {
  id: string;
  title: string;
  level: string;
  salary_range: string;
  work_type: string;
  description: string;
  requirements: string;
  benefits: string;
  sample_questions?: QuestionItem[];
}

export interface DepartmentRoleGroup {
  departmentCategory: 'tech' | 'biz' | 'hr' | 'exec' | 'general';
  name: string;
  roles: RolePreset[];
}

export const DEPARTMENT_ROLE_PRESETS: Record<string, RolePreset[]> = {
  // ── 1. KỸ THUẬT & CÔNG NGHỆ ─────────────────────────────────────
  tech: [
    {
      id: 'tech-fullstack',
      title: 'Kỹ sư Lập trình Fullstack (Next.js & Python FastAPI)',
      level: 'Senior',
      salary_range: '32.000.000 - 50.000.000 VNĐ',
      work_type: 'Hybrid (3 ngày VP / 2 ngày Remote)',
      description:
        'Phát triển các module giao diện người dùng thời gian thực với Next.js và Tailwind CSS. Xây dựng và tối ưu API hiệu năng cao với Python FastAPI và kiến trúc dịch vụ phân tán.',
      requirements:
        '- Tối thiểu 3 năm kinh nghiệm với React, TypeScript, Python (FastAPI/Django).\n- Am hiểu WebSockets, Server-Sent Events, truyền thông thời gian thực.\n- Kinh nghiệm tối ưu hóa hiệu năng frontend và xử lý dữ liệu phức tạp.',
      benefits:
        '- Thưởng dự án theo quý và lương tháng 13.\n- Gói bảo hiểm sức khỏe quốc tế cao cấp.\n- Cấp máy tính xách tay cấu hình cao (MacBook Pro / ThinkPad X1).',
      sample_questions: [
        {
          id: 'q_tech_1',
          type: 'MULTIPLE_CHOICE',
          question: 'Trong kiến trúc Next.js App Router, Server Components có đặc điểm nào sau đây?',
          options: [
            'A. Luôn thực thi trên client và hydrate tự động',
            'B. Render trên server và không chuyển code JavaScript của component xuống client bundle',
            'C. Không hỗ trợ async/await trong component',
            'D. Phải khai báo chỉ thị "use client" ở đầu file',
          ],
          correct_option: 1,
          points: 20,
        },
        {
          id: 'q_tech_2',
          type: 'MULTIPLE_CHOICE',
          question: 'Trong FastAPI, để xử lý các tác vụ ngắt I/O mà không chặn event loop, ta nên sử dụng cú pháp nào?',
          options: [
            'A. Khai báo hàm với từ khóa `async def` và gọi `await` các coroutine',
            'B. Sử dụng `time.sleep()` trực tiếp trong request handler',
            'C. Luôn tạo process mới bằng `multiprocessing`',
            'D. Tắt worker của Uvicorn',
          ],
          correct_option: 0,
          points: 20,
        },
        {
          id: 'q_tech_3',
          type: 'ESSAY',
          question: 'Hãy mô tả chiến lược thiết kế API và cơ chế đồng bộ dữ liệu thời gian thực giữa hàng nghìn người dùng đồng thời trong một cuộc họp trực tuyến.',
          rubric: 'Đánh giá: 1. Sử dụng WebSockets/SSE; 2. Cơ chế Redis Pub/Sub; 3. Xử lý race conditions và mất kết nối; 4. Tính chịu lỗi và phân tải.',
          points: 60,
        },
      ],
    },
    {
      id: 'tech-ai-llm',
      title: 'Kỹ sư Trí tuệ Nhân tạo & LLM Systems (AI Engineer)',
      level: 'Senior',
      salary_range: '40.000.000 - 65.000.000 VNĐ',
      work_type: 'Full-time / Linh hoạt',
      description:
        'Nghiên cứu, triển khai và tối ưu các mô hình ngôn ngữ lớn (SLM/LLM) chạy on-premise phục vụ trích xuất biên bản cuộc họp, phân tích giọng nói và tự động hóa tác vụ điều hành.',
      requirements:
        '- Tối thiểu 2 năm kinh nghiệm thực chiến với PyTorch, vLLM, HuggingFace, LangChain.\n- Am hiểu kỹ thuật Retrieval-Augmented Generation (RAG) và Vector Databases.\n- Có kinh nghiệm triển khai mô hình trên hạ tầng GPU Kubernetes.',
      benefits:
        '- Cụm máy chủ GPU phục vụ nghiên cứu và phát triển.\n- Cơ hội làm chủ kiến trúc lõi AI tự trị của doanh nghiệp.\n- Tham gia các hội thảo công nghệ quốc tế.',
      sample_questions: [
        {
          id: 'q_ai_1',
          type: 'MULTIPLE_CHOICE',
          question: 'Phương pháp nào sau đây giúp giảm độ trễ khi sinh token của mô hình LLM trong môi trường suy luận (inference)?',
          options: [
            'A. Tăng số lượng epoch khi fine-tune',
            'B. Sử dụng PagedAttention kết hợp KV Cache quantization',
            'C. Giảm dung lượng VRAM',
            'D. Sử dụng Batch Size = 1 mà không streaming',
          ],
          correct_option: 1,
          points: 25,
        },
        {
          id: 'q_ai_2',
          type: 'ESSAY',
          question: 'Trình bày giải pháp trích xuất tự động các cam kết hành động (action items) và người phụ trách từ bản ghi âm cuộc họp có nhiều người nói xen kẽ.',
          rubric: 'Đánh giá: 1. Speaker Diarization; 2. ASR chất lượng cao; 3. Prompting / Function calling; 4. Kiểm chứng tính chính xác.',
          points: 75,
        },
      ],
    },
    {
      id: 'tech-devops',
      title: 'Kỹ sư Hạ tầng & DevOps / SRE Engineer',
      level: 'Middle / Senior',
      salary_range: '30.000.000 - 48.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Vận hành hạ tầng đám mây riêng (On-Premise Private Cloud) và Docker/Kubernetes. Tối ưu hóa pipeline CI/CD, hệ thống giám sát (Prometheus/Grafana) và máy chủ LiveKit WebRTC.',
      requirements:
        '- Có kinh nghiệm quản trị Linux, Docker Swarm / K8s, CI/CD (GitHub Actions/GitLab CI).\n- Hiểu biết sâu về Network, Load Balancer (Nginx/Traefik), bảo mật mạng nội bộ.\n- Kinh nghiệm vận hành cơ sở dữ liệu PostgreSQL có High Availability.',
      benefits:
        '- Phụ cấp chứng chỉ AWS/CKA/Security.\n- Thưởng năng suất và dự án vượt tiến độ.\n- Môi trường hạ tầng hiện đại, tự động hóa cao.',
    },
    {
      id: 'tech-qa',
      title: 'Kỹ sư Kiểm thử Tự động (Automation QA Engineer)',
      level: 'Middle',
      salary_range: '20.000.000 - 32.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Thiết kế kịch bản và phát triển bộ kiểm thử tự động (E2E, API, Performance) cho nền tảng hội nghị và quản lý doanh nghiệp.',
      requirements:
        '- Kinh nghiệm kiểm thử với Playwright, Cypress hoặc Selenium.\n- Kỹ năng viết kịch bản kiểm thử API (Postman, k6, PyTest).\n- Tư duy phân tích lỗi và đảm bảo quy chuẩn bảo mật sản phẩm.',
      benefits:
        '- Lộ trình thăng tiến rõ ràng (Senior QA, QA Lead).\n- Đào tạo nâng cao chuyên môn kiểm thử tự động.',
    },
    {
      id: 'tech-uiux',
      title: 'Chuyên viên Thiết kế Giao diện & Trải nghiệm (UI/UX Designer)',
      level: 'Middle / Senior',
      salary_range: '22.000.000 - 35.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Thiết kế giao diện người dùng chuẩn doanh nghiệp cao cấp (Design System, Figma Tokens, Micro-interactions). Đảm bảo trải nghiệm trực quan, dễ thao tác và đồng nhất.',
      requirements:
        '- Thành thạo Figma, Design Systems, Auto Layout và Prototyping.\n- Hiểu biết về Human Interface Guidelines và Material Design.\n- Có portfolio thể hiện sản phẩm SaaS B2B hoặc ứng dụng doanh nghiệp phức tạp.',
      benefits:
        '- Màn hình 4K và trang thiết bị thiết kế chuyên nghiệp.\n- Tham gia định hình ngôn ngữ thị giác cốt lõi của Axiom.',
    },
  ],

  // ── 2. KINH DOANH & TIẾP THỊ ──────────────────────────────────
  biz: [
    {
      id: 'biz-b2b-sales',
      title: 'Chuyên viên Phát triển Khách hàng Doanh nghiệp (B2B Sales)',
      level: 'Senior',
      salary_range: '25.000.000 - 45.000.000 VNĐ + Thưởng DS',
      work_type: 'Full-time / Thị trường',
      description:
        'Tìm kiếm, tiếp cận và đàm phán hợp đồng cung cấp giải pháp Axiom Digital Enterprise OS cho các doanh nghiệp, tập đoàn và các cơ quan ban ngành.',
      requirements:
        '- Tối thiểu 2 năm kinh nghiệm bán hàng giải pháp B2B / SaaS / Công nghệ thông tin.\n- Kỹ năng giao tiếp, thương lượng và thuyết phục khách hàng doanh nghiệp xuất sắc.\n- Có mạng lưới quan hệ với các doanh nghiệp vừa và lớn là lợi thế.',
      benefits:
        '- Hoa hồng doanh số không giới hạn theo từng hợp đồng thành công.\n- Hỗ trợ công tác phí, tiếp khách và mở rộng đối tác tối đa.',
    },
    {
      id: 'biz-pre-sales',
      title: 'Chuyên viên Tư vấn Giải pháp Phần mềm (Solution Consultant)',
      level: 'Senior',
      salary_range: '28.000.000 - 42.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Phối hợp cùng đội ngũ kinh doanh phân tích bài toán nghiệp vụ của khách hàng, demo sản phẩm và xây dựng hồ sơ giải pháp kỹ thuật đáp ứng yêu cầu chuyển đổi số.',
      requirements:
        '- Nền tảng kỹ thuật tốt, hiểu biết về kiến trúc phần mềm, bảo mật dữ liệu.\n- Khả năng trình bày giải pháp kỹ thuật bằng ngôn ngữ kinh doanh mạch lạc.\n- Kỹ năng xây dựng hồ sơ đề xuất (RFP, POC).',
      benefits:
        '- Thưởng dự án trúng thầu.\n- Đào tạo chuyên sâu về kiến trúc hệ thống và chuyển đổi số.',
    },
    {
      id: 'biz-growth',
      title: 'Chuyên viên Tiếp thị Tăng trưởng & Kỹ thuật số (Growth Marketing)',
      level: 'Middle',
      salary_range: '18.000.000 - 30.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Lên chiến lược và triển khai các chiến dịch tiếp thị số (Inbound, SEO, LinkedIn B2B, Content Marketing) nhằm thu hút khách hàng tiềm năng cho giải pháp Axiom.',
      requirements:
        '- 2+ năm kinh nghiệm trong Digital Marketing B2B hoặc SaaS.\n- Thành thạo phân tích dữ liệu (Google Analytics, Mixpanel, CRM).\n- Tư duy sáng tạo và khả năng viết nội dung truyền tải giá trị công nghệ.',
      benefits:
        '- Ngân sách marketing linh hoạt và chủ động.\n- Thưởng hiệu quả lead chất lượng cao.',
    },
  ],

  // ── 3. TÀI CHÍNH & NHÂN SỰ ─────────────────────────────────────
  hr: [
    {
      id: 'hr-talent-acq',
      title: 'Chuyên viên Thu hút Nhân tài & Tuyển dụng (Talent Acquisition)',
      level: 'Middle / Senior',
      salary_range: '20.000.000 - 32.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Chịu trách nhiệm toàn trình quy trình tuyển dụng nhân sự công nghệ và các vị trí chiến lược. Xây dựng thương hiệu nhà tuyển dụng và tối ưu trải nghiệm ứng viên qua hệ thống ATS.',
      requirements:
        '- 2+ năm kinh nghiệm tuyển dụng IT/Tech trong các công ty phần mềm hoặc Headhunt.\n- Kỹ năng tìm kiếm ứng viên qua LinkedIn, GitHub, Tech Communities.\n- Am hiểu quy trình phỏng vấn theo khung năng lực (Competency Rubric).',
      benefits:
        '- Thưởng tuyển dụng nhân sự đạt KPI.\n- Môi trường làm việc năng động và hiện đại.',
    },
    {
      id: 'hr-people-ops',
      title: 'Chuyên viên Nhân sự & Văn hóa Doanh nghiệp (People & Culture)',
      level: 'Middle',
      salary_range: '16.000.000 - 25.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Quản lý hồ sơ nhân viên, vận hành chế độ lương thưởng phúc lợi (C&B), tổ chức các hoạt động gắn kết nội bộ và đào tạo hội nhập cho nhân viên mới.',
      requirements:
        '- Am hiểu luật lao động và các chế độ bảo hiểm xã hội hiện hành.\n- Kỹ năng tổ chức sự kiện và kết nối con người tốt.\n- Tỉ mỉ, chu đáo và bảo mật thông tin nhân sự.',
      benefits:
        '- Chế độ đãi ngộ tốt, du lịch hàng năm cùng công ty.',
    },
    {
      id: 'hr-accountant',
      title: 'Chuyên viên Kế toán Doanh nghiệp (Corporate Accountant)',
      level: 'Middle / Senior',
      salary_range: '18.000.000 - 28.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Hạch toán kế toán thu chi, xuất hóa đơn hợp đồng giải pháp, lập báo cáo tài chính định kỳ và đối soát các khoản thuế theo chuẩn mực kế toán Việt Nam.',
      requirements:
        '- Tốt nghiệp chuyên ngành Kế toán / Kiểm toán / Tài chính.\n- Có từ 2 năm kinh nghiệm kế toán tổng hợp tại doanh nghiệp công nghệ hoặc dịch vụ.\n- Cẩn thận, chính xác và thành thạo phần mềm kế toán.',
      benefits:
        '- Thưởng cuối năm theo kết quả kinh doanh.\n- Đầy đủ chế độ bảo hiểm theo quy định nhà nước.',
    },
  ],

  // ── 4. BAN ĐIỀU HÀNH ──────────────────────────────────────────
  exec: [
    {
      id: 'exec-assistant',
      title: 'Trợ lý Điều hành Ban Giám Đốc (Executive Operations Assistant)',
      level: 'Middle / Senior',
      salary_range: '20.000.000 - 35.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Hỗ trợ Hội Đồng Quản Trị và Ban Giám Đốc điều phối lịch họp, ghi chép và theo dõi tiến độ thực hiện các nghị quyết chỉ đạo giữa các phòng ban trong toàn cơ quan.',
      requirements:
        '- Kỹ năng giao tiếp tiếng Việt và tiếng Anh lưu loát, bảo mật thông tin tuyệt đối.\n- Khả năng tổng hợp báo cáo và điều phối công việc đa nhiệm hiệu quả.\n- Tác phong chuyên nghiệp, chuẩn mực trong môi trường cấp cao.',
      benefits:
        '- Cơ hội tiếp cận và làm việc trực tiếp cùng Ban Lãnh Đạo cao nhất.\n- Phụ cấp công tác và chế độ đãi ngộ đặc biệt.',
    },
    {
      id: 'exec-pm-scrum',
      title: 'Quản lý Dự án & Vận hành (Project Operations / Scrum Master)',
      level: 'Senior',
      salary_range: '30.000.000 - 45.000.000 VNĐ',
      work_type: 'Full-time',
      description:
        'Điều phối các sprint phát triển sản phẩm, giám sát bảng Kanban nội bộ, tháo gỡ điểm nghẽn và đảm bảo tiến độ chuyển giao các tính năng trọng điểm.',
      requirements:
        '- 3+ năm kinh nghiệm Project Manager / Scrum Master trong lĩnh vực phát triển phần mềm.\n- Có chứng chỉ PMP, PSM hoặc tương đương là lợi thế.\n- Khả năng quản trị rủi ro và điều hòa các xung đột kỹ thuật.',
      benefits:
        '- Thưởng vượt tiến độ dự án theo quý.\n- Tham gia hoạch định lộ trình sản phẩm dài hạn.',
    },
  ],
};

/**
 * Returns role presets matching department name or keywords.
 */
export function getRolePresetsForDepartment(deptName: string = ''): RolePreset[] {
  const norm = deptName.toLowerCase();
  if (norm.includes('kỹ thuật') || norm.includes('công nghệ') || norm.includes('tech') || norm.includes('phần mềm')) {
    return DEPARTMENT_ROLE_PRESETS.tech;
  }
  if (norm.includes('kinh doanh') || norm.includes('tiếp thị') || norm.includes('sales') || norm.includes('marketing') || norm.includes('thị trường')) {
    return DEPARTMENT_ROLE_PRESETS.biz;
  }
  if (norm.includes('nhân sự') || norm.includes('tài chính') || norm.includes('hr') || norm.includes('kế toán')) {
    return DEPARTMENT_ROLE_PRESETS.hr;
  }
  if (norm.includes('điều hành') || norm.includes('giám đốc') || norm.includes('hội đồng') || norm.includes('quản trị')) {
    return DEPARTMENT_ROLE_PRESETS.exec;
  }
  // Default combined suggestions
  return [
    ...DEPARTMENT_ROLE_PRESETS.tech.slice(0, 2),
    ...DEPARTMENT_ROLE_PRESETS.biz.slice(0, 2),
    ...DEPARTMENT_ROLE_PRESETS.hr.slice(0, 2),
  ];
}
