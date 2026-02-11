from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.item import Item


class DeliveryChallanItem(Base):
    __tablename__ = "delivery_challan_items"

    id = Column(Integer, primary_key=True)
    challan_id = Column(Integer, ForeignKey("delivery_challan.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    party_challan_item_id = Column(Integer, ForeignKey("party_challan_items.id"), nullable=True)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=True)
    quantity = Column(Numeric(10, 2))
    rate = Column(Numeric(10, 2), default=0)
    party_rate = Column(Numeric(10, 2), default=0)
    ok_qty = Column(Numeric(10, 2), default=0)
    cr_qty = Column(Numeric(10, 2), default=0)
    mr_qty = Column(Numeric(10, 2), default=0)

    challan = relationship("DeliveryChallan", back_populates="items")
    item = relationship(Item)
    party_challan_item = relationship("PartyChallanItem", back_populates="delivery_challan_items")
    process = relationship("Process")
