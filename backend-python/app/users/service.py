from ..errors import AppError
from ..security import hash_password, verify_password, profile
from ..common.values import data_dict
from ..common.persistence import save
from . import repository


def get_user(db, user_id):
    user = repository.get(db, user_id)
    if user is None:
        raise AppError("Usuário não encontrado", 404)
    return user


def update_profile(db, user_id, data):
    user = get_user(db, user_id)
    values = data_dict(data)
    if "email" in values and repository.find_by_email(db, str(values["email"]), excluding_id=user_id):
        raise AppError("Este e-mail já está em uso por outra conta", 409)
    for key, value in values.items():
        setattr(user, key, value)
    return profile(save(db, user))


def change_password(db, user_id, data):
    user = get_user(db, user_id)
    if not verify_password(data.currentPassword, user.passwordHash):
        raise AppError("Senha atual incorreta", 401)
    user.passwordHash = hash_password(data.newPassword)
    save(db, user)
