from sqlalchemy import select
from ..models import Investment


def list_for_user(db, user_id):
    return list(db.scalars(select(Investment).where(Investment.userId == user_id).order_by(Investment.date.desc(), Investment.createdAt.desc())).all())
