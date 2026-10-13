import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api import health, discovery, policies, checkout, orders, agent
from app.models.catalogue import DemoProduct

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paypilot")

def seed_initial_demo_catalogue():
    """Seeds default demo-store catalogue products if table is empty."""
    db = SessionLocal()
    try:
        count = db.query(DemoProduct).count()
        if count == 0:
            logger.info("Demo catalogue is empty. Seeding initial purchasable demonstration products...")
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
                    description="Quiet clicks and 8K DPI any-surface sensor with MagSpeed scrolling.",
                    fixed_price=99.00,
                    currency="USD",
                    active=True,
                    attributes_json='{"quiet_clicks": true, "sensor_dpi": 8000, "multipoint_bluetooth": true, "condition": "New"}',
                    image_url="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&q=80"
                )
            ]
            db.add_all(items)
            db.commit()
            logger.info("Successfully seeded 4 demo-store products.")
    except Exception as e:
        logger.error(f"Error seeding demo catalogue: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default catalogue
    Base.metadata.create_all(bind=engine)
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
