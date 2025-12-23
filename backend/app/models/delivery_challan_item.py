from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.item import Item


class DeliveryChallanItem(Base):
    __tablename__ = "delivery_challan_items"

    id = Column(Integer, primary_key=True)
    challan_id = Column(Integer, ForeignKey("delivery_challan.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    quantity = Column(Numeric(10, 2))

    challan = relationship("DeliveryChallan", back_populates="items")
    item = relationship(Item)
