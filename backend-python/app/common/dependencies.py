from typing import Annotated
from fastapi import Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..security import current_user

Db = Annotated[Session, Depends(get_db)]
Owner = Annotated[str, Depends(current_user)]
