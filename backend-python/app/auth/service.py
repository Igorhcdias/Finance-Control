from ..errors import AppError
from ..models import User
from ..security import hash_password, verify_password, auth_response
from ..common.persistence import save
from ..users import repository


def register(db, data):
    if repository.find_by_email(db, str(data.email)):
        raise AppError("Este e-mail já está cadastrado", 409)
    user = save(db, User(name=data.name, email=str(data.email), passwordHash=hash_password(data.password)))
    return auth_response(user)


def login(db, data):
    user = repository.find_by_email(db, str(data.email))
    if not user or not verify_password(data.password, user.passwordHash):
        raise AppError("E-mail ou senha inválidos", 401)
    return auth_response(user)
