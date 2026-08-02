"""
Custom exception classes and global error handler for structured error responses.

All API errors return a consistent JSON shape:
{
    "error": {
        "code": "NOT_FOUND",
        "message": "Meeting not found",
        "detail": null
    }
}
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppException(Exception):
    """Base application exception with structured error response."""

    def __init__(self, status_code: int, code: str, message: str, detail: str | None = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.detail = detail
        super().__init__(message)


class NotFoundException(AppException):
    """Resource not found (404)."""

    def __init__(self, resource: str = "Resource", detail: str | None = None):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=f"{resource} not found",
            detail=detail,
        )


class ValidationException(AppException):
    """Business logic validation failure (400)."""

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(
            status_code=400,
            code="VALIDATION_ERROR",
            message=message,
            detail=detail,
        )


class ProcessGateException(AppException):
    """Process gate violation — e.g. missing agenda (400)."""

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(
            status_code=400,
            code="PROCESS_GATE_VIOLATION",
            message=message,
            detail=detail,
        )


class AuthenticationException(AppException):
    """Authentication required or invalid credentials (401)."""

    def __init__(self, message: str = "Authentication required", detail: str | None = None):
        super().__init__(
            status_code=401,
            code="UNAUTHORIZED",
            message=message,
            detail=detail,
        )


class ForbiddenException(AppException):
    """Permission denied (403)."""

    def __init__(self, message: str = "Permission denied", detail: str | None = None):
        super().__init__(
            status_code=403,
            code="FORBIDDEN",
            message=message,
            detail=detail,
        )


def _error_response(status_code: int, code: str, message: str, detail: str | None = None) -> JSONResponse:
    """Build a consistent error JSON response."""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "detail": detail,
            }
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return _error_response(exc.status_code, exc.code, exc.message, exc.detail)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _error_response(
            exc.status_code,
            "HTTP_ERROR",
            str(exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        first_error = errors[0] if errors else {}
        field = " -> ".join(str(loc) for loc in first_error.get("loc", []))
        msg = first_error.get("msg", "Validation error")
        return _error_response(
            422,
            "VALIDATION_ERROR",
            f"Invalid input: {field} — {msg}",
            detail=str(errors),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Log the real error in production (future: error tracking service)
        return _error_response(
            500,
            "INTERNAL_ERROR",
            "An unexpected error occurred. Please try again later.",
        )
