"""
Interview Evaluation Rubric & Dialogue Scoring Specification.
Đặc tả bộ thang điểm đánh giá kịch bản đối thoại phỏng vấn ứng viên:
- Độ chính xác chuyên môn (Technical Accuracy)
- Kịch bản tương tác và phương pháp STAR (Dialogue Structure & STAR Alignment)
- Thời gian phản xạ và độ trôi chảy (Response Latency & Fluency)
- Thái độ và phù hợp văn hóa doanh nghiệp (Cultural & Behavioral Fit)
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PillarScore(BaseModel):
    pillar_key: str
    pillar_name: str
    weight_percent: float
    max_score: float
    earned_score: float
    confidence: float = 0.90
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)


class DialogueTurnAnalysis(BaseModel):
    question_index: int
    interviewer_question: str
    candidate_answer: str
    response_latency_seconds: float = Field(
        ..., description="Thời gian ứng viên suy nghĩ trước khi phản hồi (giây)"
    )
    speaking_duration_seconds: float = Field(default=0.0)
    words_per_minute: float = Field(default=130.0)
    filler_word_count: int = Field(
        default=0, description="Số lượng từ ngắc ngứ (ờ, à, ừm...)"
    )
    is_accurate: bool = Field(
        default=True, description="Câu trả lời có đúng kiến thức chuyên môn không"
    )
    accuracy_percent: float = Field(
        default=85.0, ge=0.0, le=100.0, description="Độ chính xác kỹ thuật"
    )
    star_method_used: bool = Field(
        default=True, description="Có áp dụng mô hình STAR (Situation, Task, Action, Result)"
    )
    latency_evaluation: str = Field(
        default="OPTIMAL",
        description="Đánh giá phản xạ: 'FAST_CONFIDENT' (<2s), 'OPTIMAL' (2-4s), 'HESITANT' (>5s)",
    )
    feedback_notes: str = ""


class InterviewScorecard(BaseModel):
    session_id: str
    application_id: Optional[str] = None
    candidate_name: str
    job_title: str
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Tổng điểm theo thang 100")
    gpa_scale_5: float = Field(..., ge=1.0, le=5.0, description="Điểm quy đổi thang 5")
    grade: str = Field(
        ..., description="Xếp loại: GRADE_S (90-100), GRADE_A (80-89), GRADE_B (65-79), GRADE_C (50-64), GRADE_D (<50)"
    )
    recommendation: str = Field(
        ..., description="'RECOMMENDED_HIRE' | 'CONSIDER' | 'NO_HIRE'"
    )
    pillars: List[PillarScore] = Field(default_factory=list)
    dialogue_turns: List[DialogueTurnAnalysis] = Field(default_factory=list)
    executive_summary: str = ""
    avg_latency_seconds: float = 2.4
    avg_accuracy_percent: float = 88.0
    archive_status: str = Field(
        default="READY_TO_ARCHIVE",
        description="'READY_TO_ARCHIVE' | 'ARCHIVED' | 'CONFIRMED'",
    )


# ────────────────────────────────────────────────────────────
# BỘ THANG ĐIỂM TIÊU CHUẨN (STANDARD EVALUATION RUBRIC)
# ────────────────────────────────────────────────────────────

STANDARD_EVALUATION_RUBRIC = {
    "rubric_name": "Axiom DX-OS & SmartHire Interview Dialogue Rubric",
    "version": 1,
    "pillars": [
        {
            "key": "TECHNICAL_ACCURACY",
            "name": "Độ chính xác & Kiến thức chuyên môn",
            "weight": 0.35,
            "max_score": 35.0,
            "description": "Đánh giá tính chuẩn xác của các giải pháp kỹ thuật, không bị ảo giác (hallucination), hiểu sâu bản chất vấn đề.",
        },
        {
            "key": "STAR_COMMUNICATION",
            "name": "Kịch bản đối thoại & Cấu trúc lập luận (STAR)",
            "weight": 0.25,
            "max_score": 25.0,
            "description": "Câu trả lời đúng trọng tâm, cấu trúc mạch lạc (Tình huống -> Nhiệm vụ -> Hành động -> Kết quả thực tế).",
        },
        {
            "key": "LATENCY_AND_FLUENCY",
            "name": "Thời gian phản xạ & Tốc độ phát biểu",
            "weight": 0.20,
            "max_score": 20.0,
            "description": "Đo độ trễ phản hồi giữa câu hỏi và câu trả lời (lý tưởng 1.5s - 3.5s), tốc độ nói trôi chảy, ít từ ngắc ngứ.",
        },
        {
            "key": "ATTITUDE_AND_CULTURE",
            "name": "Thái độ & Mức độ phù hợp văn hóa",
            "weight": 0.20,
            "max_score": 20.0,
            "description": "Sự cầu thị, tinh thần học hỏi, khả năng lắng nghe người phỏng vấn và trung thực khi gặp câu hỏi khó.",
        },
    ],
}
