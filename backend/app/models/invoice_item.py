from sqlalchemy import Column, Integer, Numeric, ForeignKey, String, JSON
from sqlalchemy.orm import relationship

from app.database.base import Base
from app.models.item import Item


from app.models.delivery_challan_item import DeliveryChallanItem

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    delivery_challan_item_id = Column(Integer, ForeignKey("delivery_challan_items.id"), nullable=True)
    
    grn_no = Column(String(50), nullable=True)
    quantity = Column(Numeric(10, 2))
    rate = Column(Numeric(10, 2))
    amount = Column(Numeric(10, 2))
    
    ok_qty = Column(Numeric(10, 2), default=0)
    cr_qty = Column(Numeric(10, 2), default=0)
    mr_qty = Column(Numeric(10, 2), default=0)
    
    challan_item_ids = Column(JSON, nullable=True)

    item = relationship(Item)
    invoice = relationship("Invoice", back_populates="items")
    delivery_challan_item = relationship(DeliveryChallanItem)
