from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class PaymentAllocation(Base):
    __tablename__ = "payment_allocation"

    id = Column(Integer, primary_key=True, index=True)
    
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoice.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    
    invoice = relationship("Invoice", backref="allocations")
