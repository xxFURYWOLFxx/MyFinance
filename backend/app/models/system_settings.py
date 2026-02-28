from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.base import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(String(500), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SystemSetting {self.key}={self.value}>"
