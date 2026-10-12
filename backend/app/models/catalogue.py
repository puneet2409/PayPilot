from sqlalchemy import Column, String, Float, Boolean, Text, DateTime
from datetime import datetime, timezone
from app.database import Base

class DemoProduct(Base):
    __tablename__ = "demo_catalogue"

    sku = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String, index=True, nullable=False)
    fixed_price = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    attributes_json = Column(Text, default="{}", nullable=False)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
