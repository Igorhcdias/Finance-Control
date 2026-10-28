from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4
from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, CheckConstraint, func
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class Identity:
    id: Mapped[str] = mapped_column(Text, primary_key=True, default=lambda: str(uuid4()))
    createdAt: Mapped[datetime] = mapped_column("created_at", DateTime, server_default=func.now())


class Updated:
    updatedAt: Mapped[datetime] = mapped_column("updated_at", DateTime, default=now, onupdate=now)


class User(Identity, Updated, Base):
    __tablename__ = "users"
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    passwordHash: Mapped[str] = mapped_column("password_hash", String(255))
    categories: Mapped[list["Category"]] = relationship(back_populates="user", passive_deletes=True)
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user", passive_deletes=True)
    investments: Mapped[list["Investment"]] = relationship(back_populates="user", passive_deletes=True)


class Category(Identity, Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "name", name="categories_user_id_name_key"), Index("categories_user_id_idx", "user_id"))
    name: Mapped[str] = mapped_column(String(50))
    color: Mapped[str] = mapped_column(String(7))
    budgetLimit: Mapped[Decimal | None] = mapped_column("budget_limit", Numeric(12, 2))
    userId: Mapped[str] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"))
    user: Mapped[User] = relationship(back_populates="categories")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category", passive_deletes="all")


class Transaction(Identity, Updated, Base):
    __tablename__ = "transactions"
    __table_args__ = (Index("transactions_user_id_date_idx", "user_id", "date"), Index("transactions_user_id_type_idx", "user_id", "type"), Index("transactions_category_id_idx", "category_id"))
    description: Mapped[str] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    type: Mapped[str] = mapped_column(ENUM("INCOME", "EXPENSE", name="TransactionType", create_type=False))
    paymentMethod: Mapped[str | None] = mapped_column("payment_method", ENUM("DEBIT", "CREDIT", name="PaymentMethod", create_type=False))
    date: Mapped[date] = mapped_column(Date)
    userId: Mapped[str] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"))
    categoryId: Mapped[str] = mapped_column("category_id", ForeignKey("categories.id", ondelete="RESTRICT", onupdate="CASCADE"))
    user: Mapped[User] = relationship(back_populates="transactions")
    category: Mapped[Category] = relationship(back_populates="transactions")


class Investment(Identity, Updated, Base):
    __tablename__ = "investments"
    __table_args__ = (Index("investments_user_id_date_idx", "user_id", "date"), CheckConstraint("amount > 0"))
    description: Mapped[str] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    date: Mapped[date] = mapped_column(Date)
    userId: Mapped[str] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"))
    user: Mapped[User] = relationship(back_populates="investments")
