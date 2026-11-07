'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { MatIcon } from '@/components/ui/MatIcon';
import { AxiomSelect } from '@/components/ui/AxiomSelect';
import { Department, OrgMemberDetail, organizationAdminApi, departmentAdminApi } from '@/lib/api';
import { getDepartmentIcon, getCleanDeptDescription } from '@/lib/departmentIcons';
import { recruitmentApi, JobOpening } from '@/lib/recruitment-api';
import { CompanyLogo } from '@/lib/companyLogos';
import { useAuthStore } from '@/lib/store/useAuthStore';

interface CreateProfessionalJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  departments: Department[];
  managers: OrgMemberDetail[];
  onSuccess: (newOpening: JobOpening) => void;
  onNotify?: (msg: string) => void;
  companyInfo?: {
    name: string;
    tagline?: string;
    logo_url?: string;
  };
}

export interface QuestionItem {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  question: string;
  options?: string[];
  correct_option?: number | string;
  rubric?: string;
  points: number;
}

/**
 * Intelligent parser that converts raw text or JSON into structured QuestionItem array.
 * Recognizes question numbers (e.g. "CÂU 1:", "BÀI TẬP TỰ LUẬN 1:"), options A/B/C/D,
 * answers (e.g. "ĐÁP ÁN ĐÚNG: B", "*A. ..."), and code/essay rubrics.
 */
export function parseRawQuestionsText(raw: string): QuestionItem[] {
  const text = raw.trim();
  if (!text) return [];

  // 1. Try parsing JSON format
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.questions || parsed.data || [];
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any, idx: number) => {
          const isEssay =
            item.type === 'ESSAY' ||
            (!item.options && !item.choices) ||
            Boolean(item.rubric && !item.options);
          const rawOpts = Array.isArray(item.options) ? item.options : Array.isArray(item.choices) ? item.choices : [];
          return {
            id: String(item.id || `parsed_q_${Date.now()}_${idx}`),
            type: isEssay ? 'ESSAY' : 'MULTIPLE_CHOICE',
            question: String(item.question || item.title || item.text || `Câu hỏi ${idx + 1}`),
            options: isEssay ? undefined : rawOpts.map((o: any) => String(o)),
            correct_option: item.correct_option ?? item.answer ?? item.key ?? 0,
            rubric: isEssay ? String(item.rubric || item.criteria || item.sample_answer || '') : undefined,
            points: Number(item.points) || (isEssay ? 30 : 20),
          };
        });
      }
    } catch {
      // Fall through to regex-based natural text parsing
    }
  }

  // 2. Intelligent Natural Text Parser
  const lines = text.split(/\r?\n/);
  const cleaned: string[] = [];
  for (const l of lines) {
    let s = l.trim();
    s = s.replace(/"""/g, '').replace(/'''/g, '').trim();
    if (/^#\s*[-=]{3,}/.test(s) || /^#\s*PHẦN\s*\d+/i.test(s)) continue;
    if (/^#\s*BỘ\s*CÂU\s*HỎI/i.test(s) || /^#\s*Bao\s*gồm/i.test(s)) continue;
    cleaned.push(s);
  }

  const qPattern = /^(?:câu\s*hỏi|câu|bài\s*tập\s*tự\s*luận|bài\s*tập|bài|question|q)\s*\d+[\s:.-]*|^\d+[\s:.)-]\s*/i;
  const blocks: string[][] = [];
  let curBlock: string[] = [];

  for (const l of cleaned) {
    if (!l) continue;
    if (qPattern.test(l)) {
      if (curBlock.length > 0) {
        blocks.push(curBlock);
        curBlock = [];
      }
    }
    curBlock.push(l);
  }
  if (curBlock.length > 0) {
    blocks.push(curBlock);
  }

  // If no "Câu X" markers were found, fallback to blank line separation
  if (blocks.length <= 1 && text.includes('\n\n')) {
    const rawBlocks = text.split(/\n\s*\n/);
    blocks.length = 0;
    for (const b of rawBlocks) {
      const blines = b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (blines.length > 0) blocks.push(blines);
    }
  }

  const optPattern = /^(?:\*|\+)?([A-Ea-e])[\s:.)\/-]\s*(.*)$/;
  const ansPattern = /^(?:đáp\s*án\s*đúng|đáp\s*án|key|answer|đ\/a|correct)[\s:.-]*([A-Ea-e0-9])/i;
  const rubricPattern = /^(?:tiêu\s*chí|barem|rubric|đáp\s*án\s*và\s*code|đáp\s*án\s*mẫu|giải\s*thích|gợi\s*ý)[\s:.-]*(.*)$/i;
  const pointsPattern = /^(?:điểm\s*số|điểm|points?|pts?|score)[\s:=-]*(\d+(?:\.\d+)?)|(?:\[|\()(\d+(?:\.\d+)?)\s*(?:điểm|pts?|points?)(?:\]|\))/i;

  const result: QuestionItem[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    if (block.length === 0) continue;

    const headerLine = block[0];
    const strippedHeader = headerLine.replace(qPattern, '').trim();

    let explicitPoints: number | undefined = undefined;
    let cleanHeader = strippedHeader;
    const headerPtsMatch = headerLine.match(/(?:\[|\()(\d+(?:\.\d+)?)\s*(?:điểm|pts?|points?)(?:\]|\))/i);
    if (headerPtsMatch) {
      explicitPoints = parseFloat(headerPtsMatch[1]);
      cleanHeader = cleanHeader
        .replace(/^(?:\[|\()(?:\d+(?:\.\d+)?)\s*(?:điểm|pts?|points?)(?:\]|\))[\s:.-]*/i, '')
        .replace(/(?:\[|\()(?:\d+(?:\.\d+)?)\s*(?:điểm|pts?|points?)(?:\]|\))$/i, '')
        .trim();
    }

    const qLines: string[] = [];
    if (cleanHeader) qLines.push(cleanHeader);

    const options: string[] = [];
    let correctOpt: number | string = 0;
    const rubricParts: string[] = [];
    let state: 'QUESTION' | 'OPTIONS' | 'ANSWER' | 'RUBRIC' = 'QUESTION';

    for (let i = 1; i < block.length; i++) {
      const line = block[i];

      // Check points
      const ptsMatch = line.match(pointsPattern);
      if (ptsMatch) {
        const val = ptsMatch[1] || ptsMatch[2];
        if (val) explicitPoints = parseFloat(val);
        continue;
      }

      // Check answer
      const ansMatch = line.match(ansPattern);
      if (ansMatch) {
        const char = ansMatch[1].toUpperCase();
        if (/[A-E]/.test(char)) {
          correctOpt = char.charCodeAt(0) - 65;
        } else if (/\d+/.test(char)) {
          correctOpt = parseInt(char, 10);
        }
        state = 'ANSWER';
        continue;
      }

      // Check rubric / explanation
      const rubMatch = line.match(rubricPattern);
      if (rubMatch) {
        const content = rubMatch[1].trim();
        if (content) rubricParts.push(content);
        state = 'RUBRIC';
        continue;
      }

      // Check option line (A. ... or *A. ...)
      const optMatch = line.match(optPattern);
      if (optMatch && (state === 'QUESTION' || state === 'OPTIONS')) {
        const letter = optMatch[1].toUpperCase();
        const content = optMatch[2].trim();
        const curIdx = options.length;
        options.push(`${letter}. ${content}`);
        if (line.startsWith('*')) {
          correctOpt = curIdx;
        }
        state = 'OPTIONS';
        continue;
      }

      // Continuation lines
      if (state === 'QUESTION') {
        qLines.push(line);
      } else if (state === 'ANSWER' || state === 'RUBRIC') {
        rubricParts.push(line);
      } else if (state === 'OPTIONS') {
        if (options.length > 0) {
          options[options.length - 1] += ' ' + line;
        } else {
          qLines.push(line);
        }
      }
    }

    const finalQText = qLines.join(' ').trim() || `Câu hỏi số ${bIdx + 1}`;
    const isEssay = options.length < 2;
    const rubricText = rubricParts.join('\n').trim() || (isEssay ? 'Đánh giá cấu trúc code, thuật toán xử lý và độ chính xác kỹ thuật.' : '');
    const defaultPts = isEssay ? 30 : 20;
    const finalPoints = explicitPoints !== undefined && !isNaN(explicitPoints) ? explicitPoints : defaultPts;

    result.push({
      id: `parsed_q_${Date.now()}_${bIdx}`,
      type: isEssay ? 'ESSAY' : 'MULTIPLE_CHOICE',
      question: finalQText,
      options: isEssay ? undefined : options,
      correct_option: isEssay ? undefined : correctOpt,
      rubric: isEssay ? rubricText : undefined,
      points: finalPoints,
    });
  }

  return result;
}

export function CreateProfessionalJobModal({
  isOpen,
  onClose,
  organizationId,
  departments,
  managers,
  onSuccess,
  onNotify,
  companyInfo,
}: CreateProfessionalJobModalProps) {
  const { activeOrganization } = useAuthStore();
  const orgName = companyInfo?.name || activeOrganization?.name || 'Axiom Enterprise';
  const orgTagline = companyInfo?.tagline || activeOrganization?.tagline || 'Digital Enterprise Protocol & Sovereign OS';
  const orgLogo = companyInfo?.logo_url || activeOrganization?.logo_url || '';

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // ── Step 1: Role Information ──
  const [title, setTitle] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>(departments || []);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [level, setLevel] = useState('Senior');
  const [salaryRange, setSalaryRange] = useState('25.000.000 - 45.000.000 VNĐ');
  const [workType, setWorkType] = useState('Hybrid (3 ngày VP / 2 ngày Remote)');
  const [location, setLocation] = useState('Keangnam Landmark 72, Hà Nội');
  const [description, setDescription] = useState(
    'Tham gia phát triển kiến trúc hệ thống phân tán, tối ưu hóa giao thức hội họp thời gian thực và quản lý hạ tầng công nghệ bảo mật cao.'
  );
  const [requirements, setRequirements] = useState(
    '- Thành thạo Python, Node.js / React, WebRTC, Docker.\n- Có kinh nghiệm thiết kế Microservices và cơ chế cân bằng tải chịu tải cao.\n- Tư duy giải quyết vấn đề xuất sắc.'
  );
  const [benefits, setBenefits] = useState(
    '- Bảo hiểm sức khỏe quốc tế PVI.\n- Thưởng KPI quý và lương tháng 13.\n- Cấp máy tính MacBook Pro M3 Max và trợ cấp chứng chỉ công nghệ.'
  );
  const [initialStatus, setInitialStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');


  // Synchronize or fallback fetch available departments
  useEffect(() => {
    if (departments && departments.length > 0) {
      setAvailableDepartments(departments);
    } else if (organizationId) {
      setLoadingDepartments(true);
      departmentAdminApi
        .list(organizationId)
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            setAvailableDepartments(list);
          }
        })
        .catch(console.warn)
        .finally(() => setLoadingDepartments(false));
    }
  }, [departments, organizationId]);

  // Sync departmentId when availableDepartments updates
  useEffect(() => {
    if (availableDepartments.length > 0) {
      const exists = availableDepartments.some((d) => d.id === departmentId);
      if (!departmentId || !exists) {
        setDepartmentId(availableDepartments[0].id);
      }
    }
  }, [availableDepartments, departmentId]);

  // Quick create default department if organization has 0 departments
  const handleQuickCreateDefaultDept = async () => {
    if (!organizationId) return;
    try {
      const newDept = await departmentAdminApi.create(organizationId, {
        name: 'Phòng Kỹ Thuật & Công Nghệ',
        description: 'Phát triển kiến trúc phần mềm, hạ tầng hệ thống và bảo mật dữ liệu',
      });
      setAvailableDepartments((prev) => [newDept, ...prev]);
      setDepartmentId(newDept.id);
      onNotify?.('Đã tạo phòng ban "Phòng Kỹ Thuật & Công Nghệ" thành công!');
    } catch (err: unknown) {
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi khi tạo phòng ban');
    }
  };

  // ── Step 2: Assessment Test Setup ──
  const [requiresTest, setRequiresTest] = useState(true);
  const [testTitle, setTestTitle] = useState('Bài Kiểm Tra Đánh Giá Năng Lực Chuyên Môn & Xử Lý Tình Huống');
  const [testDuration, setTestDuration] = useState<number>(45);
  const [passingScore, setPassingScore] = useState<number>(70);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  // Step 2 Mode Switcher: MANUAL vs IMPORT
  const [questionMode, setQuestionMode] = useState<'MANUAL' | 'IMPORT'>('MANUAL');

  // Manual Question input state
  const [newQType, setNewQType] = useState<'MULTIPLE_CHOICE' | 'ESSAY'>('MULTIPLE_CHOICE');
  const [newQText, setNewQText] = useState('');
  const [newOptA, setNewOptA] = useState('');
  const [newOptB, setNewOptB] = useState('');
  const [newOptC, setNewOptC] = useState('');
  const [newOptD, setNewOptD] = useState('');
  const [newCorrectOpt, setNewCorrectOpt] = useState<number>(0);
  const [newQRubric, setNewQRubric] = useState('');
  const [newQPoints, setNewQPoints] = useState<number>(20);

  // Smart Import state
  const [rawInputText, setRawInputText] = useState('');
  const [parsedPreviewList, setParsedPreviewList] = useState<QuestionItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 3: Interview Stage & Auto-Meeting Automation ──
  const [availableManagers, setAvailableManagers] = useState<OrgMemberDetail[]>(managers || []);
  const [assignedManagerId, setAssignedManagerId] = useState<string>(managers[0]?.id || '');
  const [interviewDuration, setInterviewDuration] = useState<number>(45);
  const [autoMeetingEnabled, setAutoMeetingEnabled] = useState(true);
  const [interviewAgenda, setInterviewAgenda] = useState(
    '1. Chào mừng & giới thiệu tổng quan vai trò.\n2. Phân tích kết quả bài kiểm tra và câu hỏi tình huống thực tế.\n3. Trao đổi chuyên sâu về năng lực giải quyết vấn đề.\n4. Giới thiệu văn hóa doanh nghiệp và giải đáp kỳ vọng ứng viên.'
  );

  // Synchronize or fallback fetch available managers
  useEffect(() => {
    const processList = (list: OrgMemberDetail[]) => {
      const eligible = list.filter((m) => ['MANAGER', 'ADMIN', 'OWNER'].includes(m.role));
      const pool = eligible.length > 0 ? eligible : list;
      return [...pool].sort((a, b) => {
        const isAHr = (a.department_name || '').toLowerCase().includes('nhân sự') || (a.job_title || '').toLowerCase().includes('hr') || (a.full_name || '').includes('Hương');
        const isBHr = (b.department_name || '').toLowerCase().includes('nhân sự') || (b.job_title || '').toLowerCase().includes('hr') || (b.full_name || '').includes('Hương');
        if (isAHr && !isBHr) return -1;
        if (!isAHr && isBHr) return 1;
        if (a.role === 'MANAGER' && b.role !== 'MANAGER') return -1;
        if (a.role !== 'MANAGER' && b.role === 'MANAGER') return 1;
        return 0;
      });
    };

    if (managers && managers.length > 0) {
      setAvailableManagers(processList(managers));
    } else if (organizationId) {
      organizationAdminApi
        .getMembers(organizationId)
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            setAvailableManagers(processList(list));
          }
        })
        .catch(console.warn);
    }
  }, [managers, organizationId]);

  // Sync assignedManagerId when availableManagers or departmentId updates
  useEffect(() => {
    if (availableManagers.length > 0) {
      const exists = availableManagers.some((m) => m.id === assignedManagerId);
      if (!assignedManagerId || !exists) {
        // 1. Prefer manager from the selected department if available
        const deptManager = availableManagers.find(
          (m) => m.department_id === departmentId && (m.role === 'MANAGER' || m.role === 'ADMIN' || m.role === 'OWNER')
        );
        // 2. Otherwise prefer HR Manager or manager with role MANAGER
        const hrManager = availableManagers.find(
          (m) =>
            m.role === 'MANAGER' &&
            ((m.department_name || '').toLowerCase().includes('nhân sự') ||
              (m.job_title || '').toLowerCase().includes('hr') ||
              (m.full_name || '').includes('Hương'))
        );
        const generalManager = availableManagers.find((m) => m.role === 'MANAGER');
        setAssignedManagerId(deptManager ? deptManager.id : hrManager ? hrManager.id : generalManager ? generalManager.id : availableManagers[0].id);
      }
    }
  }, [availableManagers, departmentId, assignedManagerId]);

  if (!isOpen) return null;

  // Selected department detail
  const currentDept = availableDepartments.find((d) => d.id === departmentId) || availableDepartments[0];
  const assignedManager = availableManagers.find((m) => m.id === assignedManagerId) || availableManagers[0];

  // Handle adding question manually
  const handleAddQuestion = () => {
    if (!newQText.trim()) {
      onNotify?.('Vui lòng nhập nội dung câu hỏi');
      return;
    }

    if (newQType === 'MULTIPLE_CHOICE') {
      if (!newOptA.trim() || !newOptB.trim()) {
        onNotify?.('Vui lòng nhập tối thiểu 2 phương án A và B');
        return;
      }
      const opts = [
        newOptA.trim().startsWith('A.') ? newOptA.trim() : `A. ${newOptA.trim()}`,
        newOptB.trim().startsWith('B.') ? newOptB.trim() : `B. ${newOptB.trim()}`,
      ];
      if (newOptC.trim()) {
        opts.push(newOptC.trim().startsWith('C.') ? newOptC.trim() : `C. ${newOptC.trim()}`);
      }
      if (newOptD.trim()) {
        opts.push(newOptD.trim().startsWith('D.') ? newOptD.trim() : `D. ${newOptD.trim()}`);
      }

      const newQ: QuestionItem = {
        id: `q_${Date.now()}`,
        type: 'MULTIPLE_CHOICE',
        question: newQText.trim(),
        options: opts,
        correct_option: Math.min(newCorrectOpt, opts.length - 1),
        points: Number(newQPoints) || 20,
      };
      setQuestions((prev) => [...prev, newQ]);
    } else {
      const newQ: QuestionItem = {
        id: `q_${Date.now()}`,
        type: 'ESSAY',
        question: newQText.trim(),
        rubric: newQRubric.trim() || 'Đánh giá tư duy giải pháp và khả năng trình bày chuyên môn.',
        points: Number(newQPoints) || 30,
      };
      setQuestions((prev) => [...prev, newQ]);
    }

    // Reset input fields
    setNewQText('');
    setNewOptA('');
    setNewOptB('');
    setNewOptC('');
    setNewOptD('');
    setNewQRubric('');
    onNotify?.('Đã thêm câu hỏi vào bài test!');
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Handle parsing text in Import mode
  const handleParseRawText = (text: string) => {
    setRawInputText(text);
    if (!text.trim()) {
      setParsedPreviewList([]);
      return;
    }
    const parsed = parseRawQuestionsText(text);
    setParsedPreviewList(parsed);
  };

  // Handle File Upload (.docx, .txt, .json, .csv, .md) with backend parser & fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    try {
      // 1. Try sending to backend parser (handles .docx zip, encoding, etc.)
      const res = await recruitmentApi.parseQuestionFile(organizationId, file);
      if (res.success && Array.isArray(res.questions) && res.questions.length > 0) {
        setParsedPreviewList(res.questions);
        onNotify?.(`Đã nhận diện thành công ${res.questions.length} câu hỏi từ file "${file.name}"!`);
        return;
      }
    } catch {
      // 2. Client-side fallback for text files
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = String(event.target?.result || '');
        const parsed = parseRawQuestionsText(content);
        setParsedPreviewList(parsed);
        if (parsed.length > 0) {
          onNotify?.(`Đã nhận diện ${parsed.length} câu hỏi từ file "${file.name}"!`);
        } else {
          onNotify?.('Không tìm thấy cấu trúc câu hỏi nào trong file.');
        }
      };
      reader.onerror = () => {
        onNotify?.('Không thể đọc file. Vui lòng kiểm tra lại!');
      };
      reader.readAsText(file);
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Apply parsed questions to test
  const handleApplyParsedQuestions = (replace: boolean = false) => {
    if (parsedPreviewList.length === 0) {
      onNotify?.('Chưa có câu hỏi nào được nhận diện để áp dụng.');
      return;
    }
    if (replace) {
      setQuestions(parsedPreviewList);
      onNotify?.(`Đã thay thế đề thi với ${parsedPreviewList.length} câu hỏi mới!`);
    } else {
      setQuestions((prev) => [...prev, ...parsedPreviewList]);
      onNotify?.(`Đã bổ sung ${parsedPreviewList.length} câu hỏi vào đề thi!`);
    }
    setParsedPreviewList([]);
    setRawInputText('');
  };

  // Download Sample Templates
  const handleDownloadTxtTemplate = () => {
    const sampleTxt = `CÂU 1:
Kiểu dữ liệu nào trong Python là kiểu dữ liệu có thứ tự, cho phép chứa các phần tử trùng lặp và CÓ THỂ thay đổi (mutable)?
A. tuple
B. list
C. set
D. str
ĐÁP ÁN ĐÚNG: B
Giải thích:
List trong Python được định nghĩa bằng dấu ngoặc vuông [], có thứ tự và có thể thay đổi giá trị các phần tử bên trong (mutable).

CÂU 2:
Kết quả của đoạn mã sau là gì?
x = [1, 2, 3]
y = x
y.append(4)
print(x)
A. [1, 2, 3]
B. [1, 2, 3, 4]
C. Lỗi (Error)
D. [4, 1, 2, 3]
ĐÁP ÁN ĐÚNG: B
Giải thích:
Phép gán y = x tạo ra tham chiếu cùng trỏ đến danh sách x trong bộ nhớ.

BÀI TẬP TỰ LUẬN 1:
Viết một hàm bằng Python có tên là dem_ky_tu(s) nhận vào một chuỗi s và trả về một dictionary đếm số lần xuất hiện của từng ký tự trong chuỗi đó.
Barem chấm điểm:
- Đúng cấu trúc hàm và nhận tham số s: 10đ
- Xử lý lặp qua các ký tự và đếm chính xác: 15đ
- Trả về dictionary kết quả chuẩn: 5đ`;

    const blob = new Blob([sampleTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau_de_thi_axiom.txt';
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.('Đã tải xuống file mẫu TXT chuẩn!');
  };

  const handleDownloadJsonTemplate = () => {
    const sampleJson = JSON.stringify(
      [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'Kiểu dữ liệu nào trong Python là mutable và có thứ tự?',
          options: ['A. tuple', 'B. list', 'C. set', 'D. str'],
          correct_option: 1,
          points: 20,
        },
        {
          type: 'ESSAY',
          question: 'Viết hàm dem_ky_tu(s) đếm tần suất xuất hiện của từng ký tự trong chuỗi.',
          rubric: 'Đúng cấu trúc hàm, sử dụng dictionary hiệu quả, độ phức tạp O(N).',
          points: 30,
        },
      ],
      null,
      2
    );
    const blob = new Blob([sampleJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau_de_thi_axiom.json';
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.('Đã tải xuống file mẫu JSON chuẩn!');
  };

  const handleFinalSubmit = async () => {
    if (!title.trim()) {
      onNotify?.('Vui lòng nhập tiêu đề vị trí tuyển dụng');
      setCurrentStep(1);
      return;
    }

    const finalDeptId = departmentId || availableDepartments[0]?.id;
    if (!finalDeptId) {
      onNotify?.('Vui lòng chọn hoặc tạo phòng ban trực thuộc trước khi phát hành tin');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      let createdAssessmentId: string | null = null;

      // 1. If test required, create assessment definition
      if (requiresTest && questions.length > 0) {
        try {
          const assRes = await recruitmentApi.createAssessmentDefinition(organizationId, {
            title: testTitle.trim() || `Bài kiểm tra: ${title.trim()}`,
            description: `Bài đánh giá đầu vào dành cho vị trí ${title.trim()} (Thời gian: ${testDuration} phút, Điểm đạt: ${passingScore}%).`,
            duration_minutes: testDuration,
            questions_json: JSON.stringify(questions),
          });
          createdAssessmentId = assRes.id;
        } catch (assErr) {
          console.warn('Could not create assessment definition on backend, continuing with rubric metadata:', assErr);
        }
      }

      // 2. Create Job Opening with rich metadata
      const rubricMetadata = {
        level,
        salary_range: salaryRange,
        work_type: workType,
        location,
        benefits,
        auto_meeting_enabled: autoMeetingEnabled,
        interview_duration_minutes: interviewDuration,
        interview_agenda: interviewAgenda,
        passing_score: passingScore,
        questions_count: questions.length,
        questions_snapshot: requiresTest ? questions : [],
      };

      const openingData: Partial<JobOpening> = {
        department_id: finalDeptId,
        title: title.trim(),
        description: description.trim() || `Tuyển dụng vị trí ${title.trim()} tại ${location}. Mức lương: ${salaryRange}.`,
        requirements: requirements.trim(),
        salary_range: salaryRange,
        level,
        work_type: workType,
        location,
        benefits,
        status: initialStatus,
        assigned_hr_member_id: assignedManagerId || null,
        requires_assessment: requiresTest,
        assessment_definition_id: createdAssessmentId,
        competency_rubric_json: JSON.stringify(rubricMetadata),
        rubric_version: 1,
      };

      const res = await recruitmentApi.createOpening(organizationId, openingData);
      onNotify?.(`✅ Đã tạo vị trí tuyển dụng "${title.trim()}" thành công!`);
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create professional opening:', err);
      const e = err as { message?: string };
      onNotify?.(e.message || 'Lỗi khi tạo vị trí tuyển dụng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ── FIXED MODAL HEADER ── */}
        <div className="shrink-0 p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <MatIcon name="work_history" size={24} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Thiết Lập Vị Trí Tuyển Dụng & Đề Thi Thông Minh</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    Live Preview
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nhập thông tin bên trái, theo dõi kết quả hiển thị trực tiếp ở màn hình bên phải theo thời gian thực.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <MatIcon name="close" size={18} />
            </button>
          </div>

          {/* Stepper Progress Tabs with modern icons */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                currentStep === 1
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <MatIcon name="badge" size={16} className={currentStep === 1 ? 'text-blue-600' : 'text-slate-400'} />
                <span>1. Thông Tin Vị Trí</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 pl-6 truncate">Chức danh, lương & mô tả</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                currentStep === 2
                  ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <MatIcon name="assignment_turned_in" size={16} className={currentStep === 2 ? 'text-purple-600' : 'text-slate-400'} />
                <span>2. Đề Thi Đánh Giá ({questions.length})</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 pl-6 truncate">Nhập tay / Import thông minh</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                currentStep === 3
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <MatIcon name="video_camera_front" size={16} className={currentStep === 3 ? 'text-emerald-600' : 'text-slate-400'} />
                <span>3. Phỏng Vấn Trực Tuyến</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 pl-6 truncate">Phòng LiveKit & AI Copilot</span>
            </button>
          </div>
        </div>

        {/* ── 2-COLUMN SPLIT MODAL BODY ── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row">
          {/* ──────────────────────────────────────────────────────────── */}
          {/* ── LEFT COLUMN: INPUT FORM (~58% WIDTH) ──────────────────── */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
            {/* ── BƯỚC 1: THÔNG TIN VỊ TRÍ ── */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Tiêu đề vị trí công việc *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="ví dụ: Senior Python & Distributed Systems Engineer"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Phòng ban trực thuộc *
                    </label>
                    {availableDepartments.length > 0 ? (
                      <AxiomSelect
                        value={departmentId}
                        onChange={(val) => setDepartmentId(val)}
                        options={availableDepartments.map((d) => ({
                          value: d.id,
                          label: d.name,
                          triggerLabel: d.name,
                          icon: getDepartmentIcon(d),
                          description: d.description ? getCleanDeptDescription(d.description) : undefined,
                        }))}
                        searchable={availableDepartments.length > 3}
                        searchPlaceholder="Tìm kiếm phòng ban..."
                        placeholder="Chọn phòng ban..."
                        width="100%"
                        triggerClassName="w-full"
                      />
                    ) : (
                      <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MatIcon name="domain" size={16} className="text-amber-600" />
                          <span>{loadingDepartments ? 'Đang tải danh sách...' : 'Chưa có phòng ban'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleQuickCreateDefaultDept}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-colors shrink-0 shadow-2xs"
                        >
                          + Tạo Phòng Ban Kỹ Thuật
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Cấp bậc chuyên môn
                    </label>
                    <AxiomSelect
                      value={level}
                      onChange={(val) => setLevel(val)}
                      options={[
                        { value: 'Intern / Thực tập', label: 'Intern / Thực tập' },
                        { value: 'Junior (1-2 năm)', label: 'Junior (1-2 năm)' },
                        { value: 'Middle (2-4 năm)', label: 'Middle (2-4 năm)' },
                        { value: 'Senior (4+ năm)', label: 'Senior (4+ năm)' },
                        { value: 'Tech Lead / Trưởng nhóm', label: 'Tech Lead / Trưởng nhóm' },
                        { value: 'Manager / Quản lý', label: 'Manager / Quản lý' },
                      ]}
                      width="100%"
                      triggerClassName="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Mức lương đề xuất (VNĐ)
                    </label>
                    <input
                      type="text"
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      placeholder="25.000.000 - 45.000.000 VNĐ"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Hình thức làm việc
                    </label>
                    <input
                      type="text"
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      placeholder="Hybrid / Full-time / Remote"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Địa điểm làm việc
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Keangnam Landmark 72, Hà Nội"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Trạng thái mở tin tuyển
                    </label>
                    <AxiomSelect
                      value={initialStatus}
                      onChange={(val) => setInitialStatus(val as 'ACTIVE' | 'DRAFT')}
                      options={[
                        { value: 'ACTIVE', label: 'Công bố tuyển ngay (Active)' },
                        { value: 'DRAFT', label: 'Lưu bản nháp (Draft)' },
                      ]}
                      width="100%"
                      triggerClassName="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mô tả chi tiết công việc (Job Description)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả các trọng trách chính, mục tiêu dự án..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Yêu cầu chuyên môn & Năng lực (Requirements)
                  </label>
                  <textarea
                    rows={3}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Các kỹ năng bắt buộc: Python, WebRTC, Docker..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white leading-relaxed font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Chế độ đãi ngộ & Quyền lợi (Benefits)
                  </label>
                  <textarea
                    rows={2}
                    value={benefits}
                    onChange={(e) => setBenefits(e.target.value)}
                    placeholder="Bảo hiểm sức khỏe, thưởng KPI, máy tính..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* ── BƯỚC 2: BÀI TEST ĐÁNH GIÁ ── */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Toggle Enable Test - Concise without verbose text */}
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MatIcon name="quiz" size={20} className="text-purple-600" />
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                      Bắt buộc hoàn thành bài test kiểm tra năng lực đầu vào
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={requiresTest}
                    onChange={(e) => setRequiresTest(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-purple-600"
                  />
                </div>

                {requiresTest && (
                  <>
                    {/* Test Overview Config with Menu Dropdown Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Tên bài kiểm tra
                        </label>
                        <input
                          type="text"
                          value={testTitle}
                          onChange={(e) => setTestTitle(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      {/* Dropdown Menu for Duration */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Thời gian làm bài thi
                        </label>
                        <AxiomSelect
                          value={String(testDuration)}
                          onChange={(val) => setTestDuration(parseInt(val, 10))}
                          options={[
                            { value: '15', label: '15 phút (Làm nhanh)' },
                            { value: '30', label: '30 phút' },
                            { value: '45', label: '45 phút (Tiêu chuẩn)' },
                            { value: '60', label: '60 phút' },
                            { value: '90', label: '90 phút' },
                            { value: '120', label: '120 phút (Chuyên sâu)' },
                          ]}
                          width="100%"
                          triggerClassName="w-full"
                        />
                      </div>
                    </div>

                    {/* Mode Switcher */}
                    <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setQuestionMode('MANUAL')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          questionMode === 'MANUAL'
                            ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <MatIcon name="edit_note" size={16} />
                        <span>Cách 1: Nhập Thủ Công</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuestionMode('IMPORT')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          questionMode === 'IMPORT'
                            ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <MatIcon name="upload_file" size={16} />
                        <span>Cách 2: Import Từ File / Dán Văn Bản</span>
                      </button>
                    </div>

                    {/* ── CÁCH 1: NHẬP THỦ CÔNG ── */}
                    {questionMode === 'MANUAL' && (
                      <div className="p-4 rounded-2xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                            <MatIcon name="add_circle" size={16} className="text-purple-600" />
                            <span>Thêm Câu Hỏi Vào Đề Thi:</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setNewQType('MULTIPLE_CHOICE')}
                              className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                                newQType === 'MULTIPLE_CHOICE'
                                  ? 'bg-purple-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              Trắc nghiệm
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewQType('ESSAY')}
                              className={`px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                                newQType === 'ESSAY'
                                  ? 'bg-purple-600 text-white shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              Tự luận
                            </button>
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={newQText}
                            onChange={(e) => setNewQText(e.target.value)}
                            placeholder="Nhập nội dung câu hỏi..."
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>

                        {newQType === 'MULTIPLE_CHOICE' ? (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <input
                                type="text"
                                value={newOptA}
                                onChange={(e) => setNewOptA(e.target.value)}
                                placeholder="Phương án A..."
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                              <input
                                type="text"
                                value={newOptB}
                                onChange={(e) => setNewOptB(e.target.value)}
                                placeholder="Phương án B..."
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                              <input
                                type="text"
                                value={newOptC}
                                onChange={(e) => setNewOptC(e.target.value)}
                                placeholder="Phương án C (tùy chọn)..."
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                              <input
                                type="text"
                                value={newOptD}
                                onChange={(e) => setNewOptD(e.target.value)}
                                placeholder="Phương án D (tùy chọn)..."
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  Đáp án đúng có sẵn:
                                </span>
                                <select
                                  value={newCorrectOpt}
                                  onChange={(e) => setNewCorrectOpt(parseInt(e.target.value))}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                                >
                                  <option value={0}>Phương án A</option>
                                  <option value={1}>Phương án B</option>
                                  <option value={2}>Phương án C</option>
                                  <option value={3}>Phương án D</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Điểm:</span>
                                <input
                                  type="number"
                                  min={5}
                                  max={100}
                                  value={newQPoints}
                                  onChange={(e) => setNewQPoints(parseInt(e.target.value) || 20)}
                                  className="w-16 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-center"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={newQRubric}
                              onChange={(e) => setNewQRubric(e.target.value)}
                              placeholder="Tiêu chí chấm điểm (Barem/Rubric) hoặc đáp án mẫu..."
                              className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                            />
                            <div className="flex justify-end items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Điểm:</span>
                              <input
                                type="number"
                                min={10}
                                max={100}
                                value={newQPoints}
                                onChange={(e) => setNewQPoints(parseInt(e.target.value) || 30)}
                                className="w-16 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-center"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                          >
                            <MatIcon name="add" size={16} />
                            <span>Lưu Câu Hỏi Vào Đề</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── CÁCH 2: IMPORT TỰ ĐỘNG ── */}
                    {questionMode === 'IMPORT' && (
                      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <MatIcon name="auto_fix_high" size={16} className="text-purple-600" />
                            <span>Tự Động Bóc Tách Câu Hỏi & Đáp Án</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleDownloadTxtTemplate}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                              title="Tải file text mẫu"
                            >
                              <MatIcon name="description" size={13} />
                              <span>Mẫu .TXT</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleDownloadJsonTemplate}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                              title="Tải file JSON mẫu"
                            >
                              <MatIcon name="code" size={13} />
                              <span>Mẫu .JSON</span>
                            </button>
                          </div>
                        </div>

                        {/* File Upload Dropzone */}
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-300 dark:border-purple-800/80 rounded-2xl bg-white dark:bg-slate-900 hover:border-purple-500 transition-colors">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".docx,.txt,.json,.csv,.md"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="question-file-input"
                          />
                          <label
                            htmlFor="question-file-input"
                            className="flex flex-col items-center justify-center cursor-pointer space-y-1.5 text-center"
                          >
                            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                              <MatIcon name={isParsingFile ? 'sync' : 'cloud_upload'} size={22} className={isParsingFile ? 'animate-spin' : ''} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline">
                                {isParsingFile ? 'Đang đọc và bóc tách file...' : 'Nhấn để chọn file Word (.docx), .txt, .json'}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-400">
                              Hỗ trợ bóc tách trực tiếp file <strong>.docx, .txt, .json, .md</strong>
                            </p>
                          </label>
                        </div>

                        {/* Raw Text Paste Alternative */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Hoặc dán văn bản thô vào đây:
                            </label>
                            {rawInputText && (
                              <button
                                type="button"
                                onClick={() => handleParseRawText('')}
                                className="text-[10.5px] text-rose-500 hover:underline cursor-pointer"
                              >
                                Xóa sạch
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={4}
                            value={rawInputText}
                            onChange={(e) => handleParseRawText(e.target.value)}
                            placeholder={`CÂU 1:\nKiểu dữ liệu nào trong Python là mutable?\nA. tuple\nB. list\nC. set\nD. str\nĐÁP ÁN ĐÚNG: B`}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono leading-relaxed"
                          />
                        </div>

                        {/* Parsed Preview Card */}
                        {parsedPreviewList.length > 0 && (
                          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                                <MatIcon name="check_circle" size={16} className="text-emerald-500" />
                                <span>Tìm thấy <strong>{parsedPreviewList.length}</strong> câu hỏi</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApplyParsedQuestions(true)}
                                  className="px-3 py-1 text-xs font-bold rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 hover:bg-purple-100 cursor-pointer"
                                >
                                  Thay Thế Đề Thi
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyParsedQuestions(false)}
                                  className="px-3.5 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs"
                                >
                                  Thêm Vào Đề Hiện Tại
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── BƯỚC 3: LỊCH PHỎNG VẤN TỰ ĐỘNG ── */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Concise toggle without long verbose paragraph */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MatIcon name="video_camera_front" size={20} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Tự động khởi tạo cuộc họp phỏng vấn trực tuyến khi ứng viên nộp bài test
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoMeetingEnabled}
                    onChange={(e) => setAutoMeetingEnabled(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Chỉ định Người phỏng vấn & Host cuộc họp (Owner hoặc Manager đều được) *
                    </label>
                    {availableManagers.length > 0 ? (
                      <AxiomSelect
                        value={assignedManagerId}
                        onChange={(val) => setAssignedManagerId(val)}
                        options={availableManagers.map((m) => ({
                          value: m.id,
                          label: `${m.full_name} (${m.role}${m.department_name ? ` • ${m.department_name}` : ''})`,
                          triggerLabel: m.full_name,
                          description: `${m.email}${m.job_title ? ` • ${m.job_title}` : ''}`,
                          badge: m.role,
                        }))}
                        width="100%"
                        triggerClassName="w-full"
                      />
                    ) : (
                      <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                        <MatIcon name="warning" size={16} className="text-amber-600" />
                        <span>Đang tải danh sách quản lý...</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Thời lượng phỏng vấn
                    </label>
                    <AxiomSelect
                      value={String(interviewDuration)}
                      onChange={(val) => setInterviewDuration(parseInt(val, 10))}
                      options={[
                        { value: '30', label: '30 phút' },
                        { value: '45', label: '45 phút (Khuyến nghị)' },
                        { value: '60', label: '60 phút' },
                        { value: '90', label: '90 phút' },
                      ]}
                      width="100%"
                      triggerClassName="w-full"
                    />
                  </div>

                  {/* Designated Host Card */}
                  {assignedManager && (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {assignedManager.full_name?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {assignedManager.full_name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Host Cuộc Họp
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {assignedManager.email} {assignedManager.department_name ? `• ${assignedManager.department_name}` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-mono text-slate-400">
                        {assignedManager.role}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Chương trình phỏng vấn chuẩn (Interview Agenda & Rubric)
                  </label>
                  <textarea
                    rows={5}
                    value={interviewAgenda}
                    onChange={(e) => setInterviewAgenda(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-mono leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* ── RIGHT COLUMN: LIVE PREVIEW SCREEN (~42% WIDTH) ────────── */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="w-full lg:w-[440px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-5 overflow-y-auto flex flex-col space-y-3.5">
            {/* ── PREVIEW FOR STEP 1: LIVE JOB BOARD POSTING PREVIEW ── */}
            {currentStep === 1 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MatIcon name="visibility" size={16} className="text-blue-600" />
                    <span>Xem Trước Tin Tuyển Dụng (Giao Diện Ứng Viên)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold">
                    {initialStatus}
                  </span>
                </div>

                {/* Simulated Job Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
                  {/* Company Info Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <CompanyLogo orgName={orgName} logoUrl={orgLogo} size={42} className="shadow-2xs" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {orgName}
                      </h4>
                      <p className="text-[10.5px] text-slate-500 truncate">
                        {orgTagline}
                      </p>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MatIcon name="place" size={12} className="text-slate-400" />
                        <span className="truncate">{location || 'Chưa nhập địa điểm'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Job Title & Badges */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                      {title || 'Tiêu đề vị trí công việc...'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <MatIcon name={getDepartmentIcon(currentDept || { name: title })} size={13} />
                      </span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {currentDept?.name || 'Phòng Ban Chung'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
                        {level}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        {salaryRange || 'Thỏa thuận'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[10.5px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {workType}
                      </span>
                    </div>
                  </div>

                  {/* Job Description Excerpt */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                      Mô tả công việc:
                    </span>
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {description || 'Chưa nhập mô tả công việc.'}
                    </p>
                  </div>

                  {/* Requirements Excerpt */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                      Yêu cầu năng lực:
                    </span>
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {requirements || 'Chưa nhập yêu cầu tuyển dụng.'}
                    </p>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                      Quyền lợi & Đãi ngộ:
                    </span>
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {benefits || 'Chưa nhập chế độ đãi ngộ.'}
                    </p>
                  </div>

                  {/* Simulated Candidate Apply Button */}
                  <div className="pt-2">
                    <div className="w-full py-2 rounded-xl bg-blue-600 text-white font-bold text-xs text-center shadow-xs opacity-90 cursor-default flex items-center justify-center gap-1.5">
                      <MatIcon name="send" size={14} />
                      <span>Nộp Hồ Sơ Ứng Tuyển Ngay</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW FOR STEP 2: QUESTIONS & ANSWER KEY MATRIX ── */}
            {currentStep === 2 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MatIcon name="fact_check" size={16} className="text-purple-600" />
                    <span>Ngân Hàng Câu Hỏi & Đáp Án ({questions.length} câu)</span>
                  </span>
                  {questions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuestions([])}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {/* Score Stats Bar */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Tổng câu</span>
                    <span className="text-base font-black text-purple-600 dark:text-purple-400">
                      {questions.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Trắc nghiệm / TL</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {questions.filter((q) => q.type === 'MULTIPLE_CHOICE').length} / {questions.filter((q) => q.type === 'ESSAY').length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Tổng thang điểm</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {questions.reduce((acc, q) => acc + (q.points || 0), 0)}đ
                    </span>
                  </div>
                </div>

                {/* Detailed Questions & Answer Key List */}
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {questions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <MatIcon name="quiz" size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-1" />
                      <span>Chưa có câu hỏi nào. Hãy nhập tay ở bên trái hoặc import file!</span>
                    </div>
                  ) : (
                    questions.map((q, idx) => {
                      const opts = Array.isArray(q.options) ? q.options : [];
                      const isEssay = q.type === 'ESSAY';
                      const corrIdx = Number(q.correct_option);
                      const corrOptText = !isEssay && !isNaN(corrIdx) && opts[corrIdx] ? opts[corrIdx] : String(q.correct_option || 'A');

                      return (
                        <div
                          key={q.id || idx}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white leading-snug">
                              Câu {idx + 1}: {q.question}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                  isEssay
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {isEssay ? 'Tự luận' : 'Trắc nghiệm'}
                              </span>
                              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700" title="Chỉnh sửa số điểm câu này">
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={q.points || (isEssay ? 30 : 20)}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setQuestions((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, points: val } : item))
                                    );
                                  }}
                                  className="w-8 text-[10px] font-black text-center bg-transparent border-0 text-purple-700 dark:text-purple-300 focus:outline-hidden"
                                />
                                <span className="text-[9px] font-bold text-slate-400 pr-0.5">đ</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="text-slate-300 hover:text-rose-500 cursor-pointer p-0.5"
                                title="Xóa câu này"
                              >
                                <MatIcon name="close" size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Options breakdown */}
                          {!isEssay && opts.length > 0 && (
                            <div className="space-y-1 text-[11px] pt-1">
                              {opts.map((opt, oIdx) => {
                                const isCorrect =
                                  String(q.correct_option) === String(oIdx) ||
                                  String(q.correct_option).toLowerCase() === String.fromCharCode(65 + oIdx).toLowerCase();
                                return (
                                  <div
                                    key={oIdx}
                                    className={`px-2 py-1 rounded-md flex items-center justify-between gap-2 ${
                                      isCorrect
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-500/30'
                                        : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <span className="truncate">{opt}</span>
                                    {isCorrect && (
                                      <span className="text-[9.5px] px-1 rounded bg-emerald-600 text-white font-bold shrink-0">
                                        Đáp án đúng
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Essay Rubric */}
                          {isEssay && (
                            <div className="p-2 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/50 text-[10.5px] text-purple-900 dark:text-purple-200 space-y-0.5">
                              <strong>Barem / Tiêu chuẩn AI chấm:</strong>
                              <p className="italic leading-relaxed whitespace-pre-wrap">{q.rubric || 'Chưa cấu hình barem.'}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── PREVIEW FOR STEP 3: LIVEKIT INTERVIEW MEETING PREVIEW ── */}
            {currentStep === 3 && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MatIcon name="video_camera_front" size={16} className="text-emerald-600" />
                    <span>Mô Phỏng Phòng Phỏng Vấn LiveKit</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    WebRTC SFU
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
                  {/* LiveKit Video Stage Mockup */}
                  <div className="aspect-[16/9] w-full rounded-xl bg-slate-950 flex flex-col justify-between p-3 relative overflow-hidden text-white shadow-inner">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded-full font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        REC • AI Live
                      </span>
                      <span className="text-slate-400 font-mono">00:00:00</span>
                    </div>

                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center mx-auto">
                        <MatIcon name="groups" size={24} />
                      </div>
                      <p className="text-xs font-bold">
                        Phòng Phỏng Vấn: {title || 'Vị trí công việc'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Host: {assignedManager?.full_name || 'Quản lý'} • Thời lượng: {interviewDuration}p
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                      <span>LiveKit Sovereign OS</span>
                      <span>Mã hóa đầu cuối E2EE</span>
                    </div>
                  </div>

                  {/* Manager Host Info */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {assignedManager?.full_name?.charAt(0) || 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                        {assignedManager?.full_name || 'Quản lý phỏng vấn'}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {assignedManager?.email || 'manager@axiom.com'} • {assignedManager?.role || 'MANAGER'}
                      </span>
                    </div>
                  </div>

                  {/* Agenda Summary */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Khung chương trình phỏng vấn:
                    </span>
                    <pre className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 font-mono">
                      {interviewAgenda}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FIXED MODAL FOOTER ── */}
        <div className="shrink-0 p-5 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between z-10">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                ← Quay Lại
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              Hủy Bỏ
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) {
                    if (!title.trim()) {
                      onNotify?.('Vui lòng nhập tiêu đề vị trí trước khi sang bước tiếp theo');
                      return;
                    }
                    if (!departmentId && availableDepartments.length === 0) {
                      onNotify?.('Vui lòng tạo hoặc chọn phòng ban trực thuộc trước khi tiếp tục');
                      return;
                    }
                  }
                  setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Tiếp Theo</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <MatIcon name="rocket_launch" size={16} />
                <span>{isSubmitting ? 'Đang phát hành...' : 'Phát Hành Tin Tuyển Dụng'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
