from ..models import Investment
from ..serialization import serialize
from ..common.values import data_dict
from ..common.persistence import save, owned, delete_record
from . import repository


def save_investment(db, user_id, data, record_id=None):
    record = owned(db, Investment, record_id, user_id, "Reserva") if record_id else Investment(userId=user_id)
    for key, value in data_dict(data).items():
        setattr(record, key, value)
    return save(db, record)


def list_investments(db, user_id):
    return serialize(repository.list_for_user(db, user_id))


def delete_investment(db, user_id, record_id):
    delete_record(db, Investment, user_id, record_id, "Reserva")
