from ..errors import AppError
from ..models import Category
from ..serialization import serialize
from ..common.values import data_dict
from ..common.persistence import save, owned
from . import repository


def save_category(db, user_id, data, record_id=None):
    category = owned(db, Category, record_id, user_id, "Categoria") if record_id else Category(userId=user_id)
    values = data_dict(data)
    if "name" in values:
        if repository.find_by_name(db, user_id, values["name"], record_id):
            raise AppError("Você já possui uma categoria com esse nome", 409)
    for key, value in values.items():
        setattr(category, key, value)
    return save(db, category)


def delete_category(db, user_id, record_id):
    category = owned(db, Category, record_id, user_id, "Categoria")
    if repository.transaction_count(db, record_id):
        raise AppError("Esta categoria possui transações vinculadas e não pode ser excluída", 409)
    db.delete(category)
    db.commit()


def list_categories(db, user_id):
    return serialize(repository.list_for_user(db, user_id))
