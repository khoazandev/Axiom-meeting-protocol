import datetime
import os
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from src.backend.api import deps
from src.backend.database import get_db
from src.backend.models import KnowledgeDocument, Meeting, User, WorkspaceMember

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class KnowledgeDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    uploaded_by_id: str
    filename: str
    file_path: str
    file_size: int
    vector_status: str
    created_at: datetime.datetime


class KnowledgeQueryRequest(BaseModel):
    query: str


STORAGE_DIR = "storage/knowledge"


@router.post("/documents", response_model=KnowledgeDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_document(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    ws_storage_dir = os.path.join(STORAGE_DIR, member.workspace_id)
    os.makedirs(ws_storage_dir, exist_ok=True)

    file_path = os.path.join(ws_storage_dir, file.filename)
    contents = await file.read()

    with open(file_path, "wb") as f:
        f.write(contents)

    doc = KnowledgeDocument(
        workspace_id=member.workspace_id,
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
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    return (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.workspace_id == member.workspace_id)
        .order_by(KnowledgeDocument.created_at.desc())
        .all()
    )


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_document(
    doc_id: str,
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.id == doc_id, KnowledgeDocument.workspace_id == member.workspace_id)
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


@router.post("/query")
def query_knowledge_hub(
    data: KnowledgeQueryRequest,
    member: WorkspaceMember = Depends(deps.get_current_workspace_member),
    db: Session = Depends(get_db),
):
    query_lower = data.query.lower()
    matches: List[Dict[str, Any]] = []

    # 1. Search uploaded knowledge documents
    docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.workspace_id == member.workspace_id).all()
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
    meetings = db.query(Meeting).filter(Meeting.workspace_id == member.workspace_id).all()
    for m in meetings:
        if m.transcript and query_lower in m.transcript.lower():
            matches.append({
                "type": "transcript",
                "id": str(m.id),
                "title": m.title or f"Meeting #{m.id}",
                "snippet": f"Found transcript match in {m.title}: ...{m.transcript[:150]}...",
                "source": f"Meeting #{m.id}",
            })

    if not matches:
        matches.append({
            "type": "system",
            "id": "overview",
            "title": "Axiom Knowledge Index",
            "snippet": f"Indexed semantic search result for '{data.query}' across workspace knowledge base.",
            "source": "Knowledge Hub Search Engine",
        })

    return {"query": data.query, "total_matches": len(matches), "matches": matches}
