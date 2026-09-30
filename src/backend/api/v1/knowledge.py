import datetime
import os
from typing import Any, Dict, List, Literal
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import KnowledgeDocument, Meeting, User, OrganizationMember, TranscriptSegment

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class KnowledgeDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    uploaded_by_id: str
    filename: str
    file_path: str
    file_size: int
    vector_status: str
    meeting_id: str | None = None
    created_at: datetime.datetime


class KnowledgeMatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: Literal["document", "transcript"]
    id: str
    meeting_id: str | None = None
    title: str
    snippet: str
    source: str
    speaker_name: str | None = None
    created_at: datetime.datetime | None = None


class KnowledgeSearchResponse(BaseModel):
    query: str
    total_matches: int
    matches: list[KnowledgeMatch]


class KnowledgeQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)


STORAGE_DIR = "storage/knowledge"


@router.post("/documents", response_model=KnowledgeDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_document(
    meeting_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
    member: OrganizationMember = Depends(deps.get_current_org_member),
    db: Session = Depends(get_db),
):
    ws_storage_dir = os.path.join(STORAGE_DIR, member.organization_id)
    os.makedirs(ws_storage_dir, exist_ok=True)

    file_path = os.path.join(ws_storage_dir, file.filename)
    contents = await file.read()

    with open(file_path, "wb") as f:
        f.write(contents)

    doc = KnowledgeDocument(
        organization_id=member.organization_id,
        meeting_id=meeting_id,
        uploaded_by_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_size=len(contents),
        vector_status="READY",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents", response_model=List[KnowledgeDocumentResponse])
def list_knowledge_documents(
    meeting_id: str,
    member: OrganizationMember = Depends(deps.get_current_org_member),
    db: Session = Depends(get_db),
):
    return (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.organization_id == member.organization_id)
        .filter(KnowledgeDocument.meeting_id == meeting_id)
        .order_by(KnowledgeDocument.created_at.desc())
        .all()
    )


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_document(
    doc_id: str,
    member: OrganizationMember = Depends(deps.get_current_org_member),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.id == doc_id, KnowledgeDocument.organization_id == member.organization_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
    return None


@router.get("/documents/{doc_id}/content")
def get_knowledge_document_content(
    doc_id: str,
    member: OrganizationMember = Depends(deps.get_current_org_member),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.id == doc_id, KnowledgeDocument.organization_id == member.organization_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")
        
    try:
        from src.backend.services.text_extractor import extract_text
        with open(doc.file_path, "rb") as f:
            content = f.read()
        text = extract_text(content, doc.filename)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/utils/extract-text")
async def extract_text_from_file_util(file: UploadFile = File(...)):
    from src.backend.services.text_extractor import extract_text
    contents = await file.read()
    extracted = extract_text(contents, file.filename, file.content_type or "")
    return {"text": extracted}



@router.post("/search", response_model=KnowledgeSearchResponse)
def search_knowledge(
    req: KnowledgeQueryRequest,
    member: OrganizationMember = Depends(deps.get_current_org_member),
    db: Session = Depends(get_db),
):
    query_str = req.query.strip()
    if not query_str:
        return KnowledgeSearchResponse(query=req.query, total_matches=0, matches=[])

    query_pattern = f"%{query_str}%"
    matches: List[KnowledgeMatch] = []

    # 1. Search uploaded knowledge documents for this organization
    docs = (
        db.query(KnowledgeDocument)
        .filter(
            KnowledgeDocument.organization_id == member.organization_id,
            KnowledgeDocument.filename.ilike(query_pattern),
        )
        .order_by(KnowledgeDocument.created_at.desc())
        .limit(20)
        .all()
    )
    for d in docs:
        matches.append(
            KnowledgeMatch(
                type="document",
                id=d.id,
                meeting_id=d.meeting_id,
                title=d.filename,
                snippet=f"Document in Knowledge Base: {d.filename} ({d.file_size} bytes)",
                source=d.filename,
                speaker_name=None,
                created_at=d.created_at,
            )
        )

    # 2. Search real transcript segments joined with Meeting
    segments = (
        db.query(TranscriptSegment)
        .join(Meeting, TranscriptSegment.meeting_id == Meeting.id)
        .filter(
            Meeting.organization_id == member.organization_id,
            or_(
                TranscriptSegment.content.ilike(query_pattern),
                Meeting.title.ilike(query_pattern),
            ),
        )
        .order_by(TranscriptSegment.created_at.desc())
        .limit(30)
        .all()
    )
    for seg in segments:
        m_title = seg.meeting.title if seg.meeting else "Cuộc họp"
        snippet = seg.content.strip()
        if len(snippet) > 250:
            snippet = snippet[:247] + "..."
        matches.append(
            KnowledgeMatch(
                type="transcript",
                id=str(seg.id),
                meeting_id=str(seg.meeting_id),
                title=m_title,
                snippet=snippet,
                source=m_title,
                speaker_name=seg.speaker_name,
                created_at=seg.created_at,
            )
        )

    return KnowledgeSearchResponse(
        query=req.query,
        total_matches=len(matches),
        matches=matches,
    )


@router.get("/transcripts/recent", response_model=List[KnowledgeMatch])
def get_recent_transcripts(
    limit: int = 20,
    member: OrganizationMember = Depends(deps.get_current_org_member),
    db: Session = Depends(get_db),
):
    clamped_limit = max(1, min(limit, 50))
    segments = (
        db.query(TranscriptSegment)
        .join(Meeting, TranscriptSegment.meeting_id == Meeting.id)
        .filter(Meeting.organization_id == member.organization_id)
        .order_by(TranscriptSegment.created_at.desc())
        .limit(clamped_limit)
        .all()
    )
    results: List[KnowledgeMatch] = []
    for seg in segments:
        m_title = seg.meeting.title if seg.meeting else "Cuộc họp"
        snippet = seg.content.strip()
        if len(snippet) > 250:
            snippet = snippet[:247] + "..."
        results.append(
            KnowledgeMatch(
                type="transcript",
                id=str(seg.id),
                meeting_id=str(seg.meeting_id),
                title=m_title,
                snippet=snippet,
                source=m_title,
                speaker_name=seg.speaker_name,
                created_at=seg.created_at,
            )
        )
    return results
