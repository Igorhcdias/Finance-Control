import re
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Header
from .config import get_settings
from .errors import AppError


def hash_password(password: str) -> str:
    # bcryptjs truncates UTF-8 input to 72 bytes, including existing long passwords.
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(rounds=10)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode())
    except ValueError:
        return False


def token_lifetime(value: str) -> timedelta:
    # jsonwebtoken/ms: numeric strings represent milliseconds.
    match = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)?", value)
    if not match:
        raise ValueError("JWT_EXPIRES_IN deve usar número e unidade ms/s/m/h/d/w/y")
    scale = {None: .001, "ms": .001, "s": 1, "m": 60, "h": 3600, "d": 86400, "w": 604800, "y": 31557600}
    return timedelta(seconds=float(match[1]) * scale[match[2]])


def auth_response(user):
    settings = get_settings()
    now = datetime.now(timezone.utc)
    token = jwt.encode({"sub": user.id, "email": user.email, "iat": now, "exp": now + token_lifetime(settings.jwt_expires_in)}, settings.jwt_secret, algorithm="HS256")
    return {"token": token, "user": profile(user)}


def profile(user):
    return {"id": user.id, "name": user.name, "email": user.email}


def current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise AppError("Token de autenticação não informado", 401)
    parts = authorization.split(" ")
    if len(parts) < 2 or parts[0] != "Bearer" or not parts[1]:
        raise AppError("Formato de token inválido", 401)
    try:
        payload = jwt.decode(parts[1], get_settings().jwt_secret, algorithms=["HS256"], options={"require": ["sub"]})
        return payload["sub"]
    except jwt.InvalidTokenError:
        raise AppError("Token inválido ou expirado", 401)
