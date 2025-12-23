from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.item import Item


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"))
    item_id = Column(Integer, ForeignKey("items.id"))

    quantity = Column(Numeric(10, 2))
    rate = Column(Numeric(10, 2))
    amount = Column(Numeric(12, 2))

    invoice = relationship("Invoice", back_populates="items")
    item = relationship(Item)
