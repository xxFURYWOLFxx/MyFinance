from pydantic import BaseModel
from typing import TypeVar, Generic, Optional, List

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int


class MessageResponse(BaseModel):
    message: str


class DateRangeFilter(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class SortOrder(BaseModel):
    field: str = "created_at"
    direction: str = "desc"  # "asc" or "desc"
