from sqlalchemy import Column, Integer, Text
from app.db.session import engine
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    title = Column(Text)
    raw_text = Column(Text)
