from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import inspect
from .models import Transaction


def serialize(value):
    """Prisma decimals are strings in records; aggregate endpoints use numbers."""
    if isinstance(value, Decimal):
        return format(value.normalize(), "f")
    if isinstance(value, datetime):
        return value.isoformat(timespec="milliseconds") + "Z"
    if isinstance(value, date):
        return value.isoformat() + "T00:00:00.000Z"
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize(item) for key, item in value.items()}
    mapper = inspect(type(value), raiseerr=False)
    if mapper is not None:
        result = {attr.key: serialize(getattr(value, attr.key)) for attr in mapper.column_attrs if attr.key != "passwordHash"}
        if isinstance(value, Transaction):
            result["category"] = serialize(value.category)
        return result
    return value
