from sqlalchemy import select
from ..errors import AppError


def save(db, record):
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def owned(db, model, record_id, user_id, label):
    record = db.scalar(select(model).where(model.id == record_id, model.userId == user_id))
    if record is None:
        raise AppError(f"{label} não encontrada", 404)
    return record


def delete_record(db, model, user_id, record_id, label):
    db.delete(owned(db, model, record_id, user_id, label))
    db.commit()
