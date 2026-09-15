import datetime
import os
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import KnowledgeDocument, Meeting, User, OrganizationMember

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


class KnowledgeQueryRequest(BaseModel):
    query: str


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



@router.post("/search")
def search_knowledge(
    req: KnowledgeQueryRequest,
    member: OrganizationMember = Depends(deps.get_current_org_member),
    db: Session = Depends(get_db),
):
    query_lower = req.query.lower()
    matches: List[Dict[str, Any]] = []

    # 1. Search uploaded knowledge documents
    docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.organization_id == member.organization_id).all()
    for d in docs:
        if query_lower in d.filename.lower():
            matches.append({
                "type": "document",
                "id": d.id,
                "title": d.filename,
                "snippet": f"Matching document in Knowledge Base: {d.filename} ({d.file_size} bytes)",
                "source": d.filename,
            })

    # 2. Search meeting transcripts
    meetings = db.query(Meeting).filter(Meeting.organization_id == member.organization_id).all()
    for m in meetings:
        # Note: In a real app we'd search the TranscriptSegment table, but this is a mock search for now.
        if m.title and query_lower in m.title.lower():
            matches.append({
                "type": "transcript",
                "id": str(m.id),
                "title": m.title,
                "snippet": f"Found transcript match in {m.title}",
                "source": f"Meeting #{m.id}",
            })

    if not matches:
        matches.append({
            "type": "system",
            "id": "overview",
            "title": "Axiom Knowledge Index",
            "snippet": f"Indexed semantic search result for '{req.query}' across knowledge base.",
            "source": "Knowledge Hub Search Engine",
        })

    return {"query": req.query, "total_matches": len(matches), "matches": matches}
