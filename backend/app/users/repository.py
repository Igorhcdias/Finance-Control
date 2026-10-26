from sqlalchemy import select
from ..models import User


def get(db, user_id):
    return db.get(User, user_id)


def find_by_email(db, email, excluding_id=None):
    query = select(User).where(User.email == email)
    if excluding_id is not None:
        query = query.where(User.id != excluding_id)
    return db.scalar(query)
