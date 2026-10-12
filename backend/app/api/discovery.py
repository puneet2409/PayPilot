import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.discovery import DiscoverySearchRequest, DiscoverySearchResponse
from app.integrations.channel3 import channel3_client
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/v1/discovery", tags=["Discovery"])

@router.post("/search", response_model=DiscoverySearchResponse)
async def search_products(
    request: DiscoverySearchRequest,
    db: Session = Depends(get_db)
):
    search_id = f"srch_{uuid.uuid4().hex[:8]}"
    results = await channel3_client.search(
        query=request.query,
        max_price=request.max_price,
        limit=request.limit,
        user_id=search_id
    )

    AuditService.record_event(
        db=db,
        event_type="SEARCH_REQUESTED",
        details={
            "search_id": search_id,
            "query": request.query,
            "max_price": request.max_price,
            "results_count": len(results)
        }
    )

    return DiscoverySearchResponse(
        search_id=search_id,
        query=request.query,
        results=results
    )
