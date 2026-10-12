import json
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent

class AuditService:
    @staticmethod
    def record_event(
        db: Session,
        event_type: str,
        details: Dict[str, Any],
        session_id: Optional[str] = None,
        order_id: Optional[str] = None
    ) -> AuditEvent:
        event = AuditEvent(
            id=f"audit_{uuid.uuid4().hex[:10]}",
            session_id=session_id,
            order_id=order_id,
            event_type=event_type,
            details_json=json.dumps(details),
            created_at=datetime.now(timezone.utc)
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_timeline(
        db: Session,
        session_id: Optional[str] = None,
        order_id: Optional[str] = None
    ) -> List[AuditEvent]:
        query = db.query(AuditEvent)
        if order_id:
            query = query.filter(AuditEvent.order_id == order_id)
        elif session_id:
            query = query.filter(AuditEvent.session_id == session_id)
        return query.order_by(AuditEvent.created_at.asc()).all()
