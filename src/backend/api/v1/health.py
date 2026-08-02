"""
Health and root endpoints.
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
def read_root():
    return {"message": "Welcome to Axiom — Enterprise Meeting Protocol API (DX-OS)"}


@router.get("/health")
def health_check():
    return {"status": "healthy"}
