from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.item import Item


class PartyChallanItem(Base):
    __tablename__ = "party_challan_items"

    id = Column(Integer, primary_key=True)
    party_challan_id = Column(Integer, ForeignKey("party_challan.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=True)
    quantity_ordered = Column(Numeric(10, 2), nullable=False)
    quantity_delivered = Column(Numeric(10, 2), default=0)
    rate = Column(Numeric(10, 2), nullable=True)

    party_challan = relationship("PartyChallan", back_populates="items")
    item = relationship(Item)
    process = relationship("Process")
    delivery_challan_items = relationship("DeliveryChallanItem", back_populates="party_challan_item")
