import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api import health, discovery, policies, checkout, orders, agent, sessions, webhooks, analytics
from app.models.catalogue import DemoProduct
from app.security import validate_auth_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paypilot")

def seed_initial_demo_catalogue():
    """Seeds default demo-store catalogue products if they do not exist."""
    db = SessionLocal()
    try:
        items = [
            DemoProduct(
                sku="HEADSET-DEMO-01",
                title="Anker Soundcore Space Q45 Wireless Noise Cancelling Headphones",
                brand="Anker",
                category="wireless headset",
                description="Adaptive noise cancelling with 50-hour playtime and ultra-clear microphones.",
                fixed_price=89.99,
                currency="USD",
                active=True,
                attributes_json='{"multipoint_bluetooth": true, "built_in_microphone": true, "battery_life_hours": 50, "condition": "New"}',
                image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80"
            ),
            DemoProduct(
                sku="HEADSET-DEMO-02",
                title="JBL Tune 760NC Wireless Over-Ear Active Noise Cancelling Headphones",
                brand="JBL",
                category="wireless headset",
                description="Lightweight and foldable with pure bass sound and multipoint connection.",
                fixed_price=79.95,
                currency="USD",
                active=True,
                attributes_json='{"multipoint_bluetooth": true, "built_in_microphone": true, "battery_life_hours": 35, "condition": "New"}',
                image_url="https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&q=80"
            ),
            DemoProduct(
                sku="DOCK-DEMO-01",
                title="Anker 575 USB-C Docking Station (13-in-1 Triple Display)",
                brand="Anker",
                category="usb-c dock",
                description="Triple display support with 85W high-speed laptop charging.",
                fixed_price=139.99,
                currency="USD",
                active=True,
                attributes_json='{"ports_count": 13, "power_delivery_watts": 85, "triple_display": true, "condition": "New"}',
                image_url="https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&q=80"
            ),
            DemoProduct(
                sku="MOUSE-DEMO-01",
                title="Logitech MX Master 3S Performance Wireless Mouse",
                brand="Logitech",
                category="wireless mouse",
                description="Quiet clicks and 8K DPI any-surface sensor with MagSpeed scrolling for ultimate productivity.",
                fixed_price=99.00,
                currency="USD",
                active=True,
                attributes_json='{"quiet_clicks": true, "sensor_dpi": 8000, "multipoint_bluetooth": true, "productivity": true, "quiet": true, "wireless": true, "condition": "New"}',
                image_url="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&q=80"
            ),
            DemoProduct(
                sku="FLASH-DEMO-01",
                title="SanDisk 128GB Ultra Dual Drive Luxe USB Type-C Flash Drive",
                brand="SanDisk",
                category="flash drive",
                description="High-speed USB 3.1 Gen 1 performance with reversible Type-C and traditional Type-A connectors.",
                fixed_price=19.99,
                currency="USD",
                active=True,
                attributes_json='{"capacity_gb": 128, "connector": "USB-C and USB-A", "read_speed_mbps": 150, "condition": "New"}',
                image_url="https://images.unsplash.com/photo-1624823183493-ed5832f44e18?w=500"
            )
        ]
        added = False
        for item in items:
            existing = db.query(DemoProduct).filter(DemoProduct.sku == item.sku).first()
            if not existing:
                db.add(item)
                added = True
        if added:
            db.commit()
            logger.info("Successfully seeded demo-store products.")
    except Exception as e:
        logger.error(f"Error seeding demo catalogue: {e}")
    finally:
        db.close()

def ensure_schema_migrations():
    """Applies non-destructive schema migrations for existing SQLite and PostgreSQL databases."""
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        with engine.connect() as conn:
            if "audit_events" in tables:
                cols = [c["name"] for c in inspector.get_columns("audit_events")]
                if "prev_hash" not in cols:
                    conn.execute(text("ALTER TABLE audit_events ADD COLUMN prev_hash VARCHAR;"))
                    conn.commit()
                    logger.info("Migrated audit_events: added prev_hash column.")
                if "entry_hash" not in cols:
                    conn.execute(text("ALTER TABLE audit_events ADD COLUMN entry_hash VARCHAR DEFAULT 'GENESIS_HASH';"))
                    conn.commit()
                    logger.info("Migrated audit_events: added entry_hash column.")

            if "quotes" in tables:
                q_cols = [c["name"] for c in inspector.get_columns("quotes")]
                new_quote_cols = [
                    ("item_price", "FLOAT"),
                    ("estimated_tax", "FLOAT"),
                    ("shipping_cost", "FLOAT"),
                    ("landed_cost", "FLOAT"),
                    ("merchant", "VARCHAR"),
                    ("quote_signature", "VARCHAR"),
                ]
                for col_name, col_type in new_quote_cols:
                    if col_name not in q_cols:
                        conn.execute(text(f"ALTER TABLE quotes ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
                        logger.info(f"Migrated quotes: added {col_name} column.")
    except Exception as e:
        logger.error(f"Schema migration error: {e}")
        raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default catalogue
    validate_auth_config()
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations()
    seed_initial_demo_catalogue()
    yield
    # Shutdown

app = FastAPI(
    title="PayPilot API",
    description="Consent-First Agentic Commerce with Deterministic Purchase Policies & PayPal Sandbox",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
allowed_origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include Routers
app.include_router(health.router)
app.include_router(discovery.router)
app.include_router(policies.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(agent.router)
app.include_router(sessions.router)
app.include_router(webhooks.router)
app.include_router(analytics.router)

