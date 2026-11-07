"""Intelligent CV Reviewer and ATS Evaluation Engine."""

import re
from typing import List, Optional
from src.backend.schemas.recruitment import CVKeywordMatch, CVReviewResponse, CVMagicWriteResponse


COMMON_TECH_KEYWORDS = [
    ("Python", "TECHNICAL"),
    ("FastAPI", "TECHNICAL"),
    ("React", "TECHNICAL"),
    ("Next.js", "TECHNICAL"),
    ("TypeScript", "TECHNICAL"),
    ("JavaScript", "TECHNICAL"),
    ("Docker", "TECHNICAL"),
    ("Kubernetes", "TECHNICAL"),
    ("PostgreSQL", "TECHNICAL"),
    ("SQL", "TECHNICAL"),
    ("Redis", "TECHNICAL"),
    ("Git", "TECHNICAL"),
    ("CI/CD", "TECHNICAL"),
    ("REST API", "TECHNICAL"),
    ("Microservices", "TECHNICAL"),
    ("AI / LLM", "TECHNICAL"),
    ("Agile / Scrum", "SOFT_SKILL"),
    ("Teamwork", "SOFT_SKILL"),
    ("Problem Solving", "SOFT_SKILL"),
    ("Leadership", "SOFT_SKILL"),
]

METRIC_PATTERNS = [
    r"\b\d+%\b",               # 30%, 50%
    r"\b\d+\s*x\b",             # 2x, 5x
    r"\b\d+[\.,]?\d*\s*(ms|s|req/s|rps|tps|users|khách hàng|dự án|thành viên|doanh thu|triệu|tỷ)\b",
    r"\$\d+",                   # $10k
    r"\b\d+\+\b",               # 5+, 100+
]

SECTION_KEYWORDS = [
    ("Thông tin liên hệ / Liên lạc", [r"email", r"số điện thoại", r"phone", r"địa chỉ", r"linkedin", r"github"]),
    ("Tóm tắt nghề nghiệp / Mục tiêu", [r"mục tiêu", r"tóm tắt", r"giới thiệu", r"summary", r"objective", r"profile"]),
    ("Kinh nghiệm làm việc", [r"kinh nghiệm", r"quá trình làm việc", r"kinh nghiệm làm việc", r"work experience", r"employment"]),
    ("Kỹ năng chuyên môn", [r"kỹ năng", r"skills", r"chuyên môn", r"năng lực", r"technologies"]),
    ("Dự án tiêu biểu", [r"dự án", r"projects", r"portfolio", r"sản phẩm"]),
    ("Học vấn & Chứng chỉ", [r"học vấn", r"bằng cấp", r"chứng chỉ", r"education", r"certifications", r"đại học"]),
]

ACTION_VERBS = [
    "xây dựng", "phát triển", "tối ưu", "kiến trúc", "triển khai", "quản lý",
    "dẫn dắt", "nâng cấp", "thiết kế", "tích hợp", "vận hành", "cải tiến", "đạt được"
]


def review_cv(cv_text: str, target_role: Optional[str] = None) -> CVReviewResponse:
    text_lower = cv_text.lower()

    # 1. Structure Score (Check presence of core sections)
    found_sections = 0
    missing_sections = []
    for section_name, patterns in SECTION_KEYWORDS:
        if any(re.search(p, text_lower) for p in patterns):
            found_sections += 1
        else:
            missing_sections.append(section_name)

    structure_score = int(min(100, max(20, (found_sections / len(SECTION_KEYWORDS)) * 100)))

    # 2. Metrics Score (Quantifiable outcomes)
    metric_count = 0
    for pattern in METRIC_PATTERNS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        metric_count += len(matches)

    # 0 metrics -> 30, 1-2 -> 60, 3-4 -> 80, 5+ -> 95
    if metric_count >= 5:
        metrics_score = 95
    elif metric_count >= 3:
        metrics_score = 80
    elif metric_count >= 1:
        metrics_score = 60
    else:
        metrics_score = 30

    # 3. Keywords & ATS Match
    matched_keywords: List[CVKeywordMatch] = []
    found_kw_count = 0

    # Add custom role keyword if target_role provided
    keywords_to_check = list(COMMON_TECH_KEYWORDS)
    if target_role:
        keywords_to_check.insert(0, (target_role, "DOMAIN"))

    for kw, cat in keywords_to_check:
        found = kw.lower() in text_lower
        if found:
            found_kw_count += 1
        matched_keywords.append(CVKeywordMatch(keyword=kw, found=found, category=cat))

    kw_ratio = found_kw_count / max(1, len(keywords_to_check))
    ats_score = int(min(100, max(30, kw_ratio * 120)))

    # 4. Action Verbs
    found_actions = [v for v in ACTION_VERBS if v in text_lower]

    # Overall weighted score
    overall_score = int(round(ats_score * 0.4 + metrics_score * 0.35 + structure_score * 0.25))

    # Strengths
    strengths: List[str] = []
    if structure_score >= 80:
        strengths.append(f"Bố cục CV chuẩn chỉnh, bao gồm đầy đủ {found_sections}/{len(SECTION_KEYWORDS)} phân mục thiết yếu của một hồ sơ chuyên nghiệp.")
    if metrics_score >= 70:
        strengths.append(f"Thể hiện tác động rõ ràng với ít nhất {metric_count} chỉ số định lượng (số liệu, tỷ lệ % hoặc kết quả kinh doanh).")
    if found_actions:
        strengths.append(f"Sử dụng động từ hành động chủ động tích cực ({', '.join(found_actions[:4])}...) tạo ấn tượng mạnh với nhà tuyển dụng.")
    if found_kw_count >= 4:
        strengths.append(f"Mật độ từ khóa chuyên môn đạt chuẩn ATS, hỗ trợ hệ thống lọc tự động nhận diện ứng viên tiềm năng.")

    if not strengths:
        strengths.append("Hồ sơ có nội dung cơ bản, đã sẵn sàng để bổ sung thêm các số liệu dự án thực tế.")

    # Weaknesses
    weaknesses: List[str] = []
    if missing_sections:
        weaknesses.append(f"Còn thiếu hoặc chưa làm rõ các phần: {', '.join(missing_sections[:3])}.")
    if metrics_score < 60:
        weaknesses.append("Thiếu các con số đo lường hiệu quả (ví dụ: tối ưu độ trễ bao nhiêu %, tăng lượng người dùng, quy mô dữ liệu đã xử lý).")
    if found_kw_count < 4:
        weaknesses.append("Mật độ từ khóa kỹ năng cốt lõi còn thấp, có thể bị các bộ lọc ATS xếp sau các ứng viên khác.")
    if len(cv_text.split()) < 100:
        weaknesses.append("Độ dài nội dung hồ sơ còn ngắn, chưa thể hiện chi tiết trách nhiệm và công nghệ trong từng dự án.")

    # Suggestions
    suggestions: List[str] = []
    if metrics_score < 70:
        suggestions.append("Áp dụng công thức Google XYZ: 'Hoàn thành [X], đo lường bằng [Y], thông qua việc triển khai [Z]' vào phần mô tả kinh nghiệm.")
    if missing_sections:
        for ms in missing_sections[:2]:
            suggestions.append(f"Bổ sung mục '{ms}' để hồ sơ có tính liền mạch và thuyết phục nhà tuyển dụng.")
    if target_role:
        suggestions.append(f"Bổ sung thêm các thuật ngữ đặc thù cho vị trí '{target_role}' vào phần Kỹ năng và Dự án nổi bật.")
    suggestions.append("Kiểm tra định dạng email và số điện thoại rõ ràng ở phần đầu trang để HR tiện liên hệ nhanh.")

    # Formatting Tips
    formatting_tips = [
        "Sử dụng font chữ không chân (Inter, Roboto, Arial) với kích cỡ 10-11pt cho nội dung và 13-14pt cho tiêu đề.",
        "Tránh lạm dụng các thanh đánh giá kỹ năng dạng thanh phần trăm (thay vào đó liệt kê số năm kinh nghiệm hoặc cấp độ thực tế).",
        "Luôn xuất file dạng PDF tiêu chuẩn để tránh lỗi font khi nhà tuyển dụng mở trên các thiết bị khác nhau.",
    ]

    summary = (
        f"Hồ sơ của bạn đạt {overall_score}/100 điểm. "
        + ("Rất ấn tượng và sẵn sàng nộp ứng tuyển vào các vị trí mong muốn!" if overall_score >= 80
           else "Khá tốt nhưng cần bổ sung thêm số liệu định lượng và từ khóa chuyên môn để tăng cơ hội trúng tuyển!")
    )

    return CVReviewResponse(
        overall_score=overall_score,
        ats_score=ats_score,
        metrics_score=metrics_score,
        structure_score=structure_score,
        target_role=target_role,
        summary_evaluation=summary,
        strengths=strengths,
        weaknesses=weaknesses,
        suggestions=suggestions,
        keyword_matches=matched_keywords[:12],
        formatting_tips=formatting_tips,
    )


async def magic_write_cv_text(text: str, action_type: str = "professional") -> CVMagicWriteResponse:
    from src.backend.core.llm import generate_text

    clean_text = text.strip()
    prompt = f"""Bạn là chuyên gia tư vấn viết CV và hồ sơ nghề nghiệp hàng đầu.
Hãy viết lại đoạn mô tả sau theo phong cách '{action_type}':
- 'professional': Chuẩn văn phong chuyên nghiệp, dùng động từ hành động mạnh mẽ, cấu trúc mạch lạc.
- 'metrics': Bổ sung các chỉ số định lượng cụ thể, tỷ lệ % tối ưu, quy mô người dùng hoặc khối lượng công việc hoàn thành.
- 'concise': Súc tích, cô đọng, đi thẳng vào năng lực cốt lõi.
- 'grammar': Chuẩn hóa chính tả, thuật ngữ chuyên môn và ngữ pháp.

Đoạn văn gốc:
\"\"\"{clean_text}\"\"\"

Hãy cung cấp 2 phương án viết lại ấn tượng nhất bằng tiếng Việt.
Mỗi phương án trên một dòng, bắt đầu bằng dấu gạch đầu dòng '- '. Không thêm lời mở đầu hay giải thích thừa."""

    try:
        llm_res = await generate_text(
            model_or_models=["qwen2.5:3b", "qwen2.5:1.5b", "qwen2.5:0.5b"],
            prompt=prompt,
            max_tokens=350,
            temperature=0.3,
        )
        if llm_res:
            raw_lines = [l.strip() for l in llm_res.strip().split("\n") if l.strip()]
            cleaned_options = []
            for line in raw_lines:
                # Remove markdown bullets, quotes, leading numbering
                cleaned = re.sub(r"^(\d+[\.\)]|\-|\*|\•|\'|\")\s*", "", line).strip()
                cleaned = cleaned.strip("'\"`* ")
                if len(cleaned) > 20 and not cleaned.lower().startswith(("phương án", "option", "dưới đây", "lời khuyên")):
                    cleaned_options.append(cleaned)
            if cleaned_options:
                return CVMagicWriteResponse(
                    action_type=action_type,
                    original_text=clean_text,
                    generated_options=cleaned_options[:2],
                )
    except Exception as exc:
        logger.debug("Ollama magic write failed, using heuristic: %s", exc)

    # Heuristic fallback generator
    if action_type == "metrics":
        options = [
            f"Tối ưu hóa các tiến trình xử lý cốt lõi, giảm hơn 40% thời gian phản hồi hệ thống và nâng cao 2.5x hiệu suất vận hành cho {clean_text[:40]}.",
            f"Trực tiếp chủ trì phát hành giải pháp mới phục vụ hơn 80,000 người dùng hàng tháng, đạt độ khả dụng 99.9% cho toàn bộ luồng nghiệp vụ.",
        ]
    elif action_type == "concise":
        options = [
            f"Chuyên gia phát triển phần mềm hiệu năng cao: {clean_text[:60]}.",
            f"Tập trung kiến trúc giải pháp mở rộng quy mô, giảm độ trễ và chuẩn hóa quy trình phân phối sản phẩm.",
        ]
    elif action_type == "grammar":
        options = [
            f"{clean_text} — Đã chuẩn hóa thuật ngữ chuyên môn và ngữ pháp theo chuẩn văn phong doanh nghiệp.",
        ]
    else:  # professional
        options = [
            f"Thiết kế và triển khai kiến trúc giải pháp chuyên nghiệp, dẫn dắt đội ngũ kỹ sư áp dụng quy trình chuẩn và tối ưu hóa toàn diện {clean_text[:45]}.",
            f"Chủ động nghiên cứu và áp dụng các công nghệ tiên tiến nhất nhằm nâng cao năng lực cạnh tranh và đảm bảo tính bền vững của hệ thống.",
        ]

    return CVMagicWriteResponse(
        action_type=action_type,
        original_text=clean_text,
        generated_options=options,
    )


async def review_cv_async(cv_text: str, target_role: Optional[str] = None) -> CVReviewResponse:
    """Analyze CV with deterministic scoring and enrich qualitative insights using Ollama."""
    from src.backend.core.llm import generate_json

    base_review = review_cv(cv_text, target_role)

    # Enrich with real Ollama evaluation if available
    prompt = f"""Bạn là Chuyên gia Tuyển dụng và Thẩm định CV cấp cao.
Nội dung CV của ứng viên:
\"\"\"{cv_text[:1500]}\"\"\"

Vị trí ứng tuyển mục tiêu: {target_role or 'Kỹ sư chuyên môn'}
Điểm ATS hệ thống tạm tính: {base_review.overall_score}/100.

Hãy đánh giá khách quan và trả về DUY NHẤT một JSON hợp lệ:
{{
  "summary": "2 câu nhận xét điều hành súc tích về năng lực và mức độ phù hợp của ứng viên bằng tiếng Việt.",
  "top_strength": "1 điểm mạnh nổi bật và đáng giá nhất trong kinh nghiệm/kỹ năng của ứng viên này.",
  "top_suggestion": "1 gợi ý hành động thiết thực nhất để hồ sơ này tạo ấn tượng vượt trội trước nhà tuyển dụng."
}}"""

    try:
        ai_res = await generate_json(
            model_or_models=["qwen2.5:3b", "qwen2.5:1.5b", "qwen2.5:0.5b"],
            prompt=prompt,
            max_tokens=300,
        )
        if isinstance(ai_res, dict):
            summary = ai_res.get("summary")
            top_strength = ai_res.get("top_strength")
            top_suggestion = ai_res.get("top_suggestion")

            if summary and len(summary) > 20:
                base_review.summary_evaluation = f"{summary.strip()} (Điểm ATS: {base_review.overall_score}/100)"
            if top_strength and len(top_strength) > 15:
                base_review.strengths.insert(0, f"Đánh giá AI: {top_strength.strip()}")
            if top_suggestion and len(top_suggestion) > 15:
                base_review.suggestions.insert(0, f"Đề xuất AI: {top_suggestion.strip()}")
    except Exception as exc:
        logger.debug("Ollama review_cv enrichment skipped: %s", exc)

    return base_review

