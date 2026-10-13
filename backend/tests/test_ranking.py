from app.schemas.discovery import ProductItem, OfferItem
from app.schemas.agent import AgentIntent
from app.services.ranking import RankingEngine


def _item(product_id: str, title: str, price: float, demo_sku: str = None) -> ProductItem:
    return ProductItem(
        product_id=product_id,
        title=title,
        brand="TestBrand",
        source="demo_catalogue",
        offers=[
            OfferItem(
                merchant="Test Merchant",
                price=price,
                currency="USD",
                availability="InStock",
                buy_url="https://example.com/buy",
                observed_at="2026-01-01T00:00:00Z"
            )
        ],
        attributes={"multipoint_bluetooth": True},
        demo_sku=demo_sku
    )


def test_ranking_flags_and_demotes_over_budget_candidates():
    affordable = _item("p1", "Budget Wireless Headset", 79.95, demo_sku="SKU-A")
    pricey = _item("p2", "Premium Wireless Headset", 189.99, demo_sku="SKU-B")
    intent = AgentIntent(category="wireless headset", budget=100.0, currency="USD")

    ranked = RankingEngine.rank_candidates([pricey, affordable], intent)

    assert ranked[0].product_id == "p1"
    assert ranked[0].within_budget is True

    over = next(c for c in ranked if c.product_id == "p2")
    assert over.within_budget is False
    assert "policy engine" in over.explanation.lower()


def test_ranking_within_budget_default_true():
    item = _item("p1", "Budget Wireless Headset", 79.95)
    intent = AgentIntent(category="wireless headset", budget=100.0, currency="USD")
    ranked = RankingEngine.rank_candidates([item], intent)
    assert ranked[0].within_budget is True
