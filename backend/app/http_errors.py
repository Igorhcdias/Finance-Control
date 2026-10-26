import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from .errors import AppError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def application_error(request: Request, exc: AppError):
        return JSONResponse({"message": exc.message}, status_code=exc.status)

    async def validation_error(request: Request, exc: RequestValidationError | ValidationError):
        return JSONResponse({"message": "; ".join(error["msg"] for error in exc.errors())}, status_code=422)

    app.add_exception_handler(RequestValidationError, validation_error)
    app.add_exception_handler(ValidationError, validation_error)

    @app.exception_handler(IntegrityError)
    async def integrity_error(request: Request, exc: IntegrityError):
        code = getattr(exc.orig, "sqlstate", None)
        if code == "23505" or "UNIQUE constraint failed" in str(exc.orig):
            return JSONResponse({"message": "Registro já existe com esses dados (violação de unicidade)"}, status_code=409)
        if code == "23503" or "FOREIGN KEY constraint failed" in str(exc.orig):
            return JSONResponse({"message": "Operação viola uma restrição de integridade referencial"}, status_code=409)
        logging.exception("Falha de integridade")
        return JSONResponse({"message": "Erro interno do servidor"}, status_code=500)

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        logging.exception("Erro não tratado", exc_info=exc)
        return JSONResponse({"message": "Erro interno do servidor"}, status_code=500)
