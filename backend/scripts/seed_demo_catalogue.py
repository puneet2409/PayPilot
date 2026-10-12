import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.catalogue import DemoProduct

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_count = db.query(DemoProduct).count()
        print(f"Current catalogue items count: {existing_count}")
        if existing_count == 0:
            print("Seeding initial products...")
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
            print("Seeded successfully!")
        else:
            print("Catalogue already seeded.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
