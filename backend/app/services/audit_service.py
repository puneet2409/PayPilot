import json
import uuid
import hashlib
import threading
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.audit import AuditEvent

_audit_lock = threading.Lock()


def _acquire_cross_process_db_lock(db: Session) -> None:
    """Serializes audit chain writes across multiple worker processes/instances."""
    try:
        bind = db.get_bind()
        dialect = bind.dialect.name if bind else ""
        if dialect == "postgresql":
            # PostgreSQL transaction advisory lock automatically serializes workers
            db.execute(text("SELECT pg_advisory_xact_lock(hashtext('paypilot_audit_lock'));"))
        elif dialect == "sqlite":
            try:
                db.execute(text("BEGIN IMMEDIATE;"))
            except Exception:
                pass
    except Exception:
        pass


class AuditService:
    @staticmethod
    def record_event(
        db: Session,
        event_type: str,
        details: Dict[str, Any],
        session_id: Optional[str] = None,
        order_id: Optional[str] = None
    ) -> AuditEvent:
        with _audit_lock:
            _acquire_cross_process_db_lock(db)
            now = datetime.now(timezone.utc)
            details_str = json.dumps(details, sort_keys=True)

            # Cryptographic Hash Chaining: fetch latest recorded event with sequence lock
            latest = db.query(AuditEvent).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).first()
            prev_hash = latest.entry_hash if latest and latest.entry_hash else "0" * 64

            event_id = f"audit_{uuid.uuid4().hex[:10]}"
            raw_payload = f"{prev_hash}:{session_id or ''}:{order_id or ''}:{event_type}:{details_str}:{now.isoformat()}"
            entry_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

            event = AuditEvent(
                id=event_id,
                session_id=session_id,
                order_id=order_id,
                event_type=event_type,
                details_json=details_str,
                prev_hash=prev_hash,
                entry_hash=entry_hash,
                created_at=now
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
        return query.order_by(AuditEvent.created_at.asc(), AuditEvent.id.asc()).all()
