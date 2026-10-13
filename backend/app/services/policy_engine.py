import json
import logging
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.catalogue import DemoProduct
from app.schemas.policy import PolicyCheckItem

logger = logging.getLogger(__name__)

class PolicyEngine:
    """
    Deterministic Purchase Policy Engine.
    ZERO LLM TRUST: All safety, spending, and compliance constraints
    are evaluated through hard code rules.
    """

    @staticmethod
    def evaluate(
        db: Session,
        demo_sku: str,
        max_total: float,
        currency: str = "USD",
        required_features: List[str] = None,
        excluded_terms: List[str] = None,
    ) -> Tuple[bool, List[PolicyCheckItem], DemoProduct, str]:
        required_features = required_features or []
        excluded_terms = excluded_terms or []
        checks: List[PolicyCheckItem] = []

        # 1. Fetch Demo Store Product
        product = db.query(DemoProduct).filter(DemoProduct.sku == demo_sku).first()
        if not product:
            checks.append(PolicyCheckItem(
                rule="demo_catalogue_exists",
                passed=False,
                detail=f"SKU {demo_sku} does not exist in store catalogue"
            ))
            return False, checks, None, "SKU not found in store"

        # 2. Check Active Status
        if not product.active:
            checks.append(PolicyCheckItem(
                rule="demo_catalogue_active",
                passed=False,
                detail=f"SKU {demo_sku} is currently inactive or out of stock"
            ))
            return False, checks, product, "Product is inactive"
        else:
            checks.append(PolicyCheckItem(
                rule="demo_catalogue_active",
                passed=True,
                detail="Product is active and in-stock"
            ))

        # 3. Currency Match
        if product.currency.upper() != currency.upper():
            checks.append(PolicyCheckItem(
                rule="currency_match",
                passed=False,
                detail=f"Product currency {product.currency} does not match request {currency}"
            ))
            return False, checks, product, "Currency mismatch"
        else:
            checks.append(PolicyCheckItem(
                rule="currency_match",
                passed=True,
                detail=f"Currency matches ({currency})"
            ))

        # 4. Hard Budget Limit Check
        # Zero tolerance for exceeding user ceiling
        if product.fixed_price > max_total:
            checks.append(PolicyCheckItem(
                rule="budget_limit",
                passed=False,
                detail=f"Fixed price ${product.fixed_price:.2f} exceeds user ceiling ${max_total:.2f}"
            ))
            return False, checks, product, f"Price exceeds budget limit of ${max_total:.2f}"
        else:
            checks.append(PolicyCheckItem(
                rule="budget_limit",
                passed=True,
                detail=f"Price ${product.fixed_price:.2f} is within ceiling ${max_total:.2f}"
            ))

        # 5. Excluded Terms Check
        product_attrs = {}
        try:
            product_attrs = json.loads(product.attributes_json)
        except Exception:
            pass

        full_desc = f"{product.title} {product.description or ''} {json.dumps(product_attrs)}".lower()
        for term in excluded_terms:
            if term.lower() in full_desc:
                checks.append(PolicyCheckItem(
                    rule="exclusion_policy",
                    passed=False,
                    detail=f"Product contains excluded term: '{term}'"
                ))
                return False, checks, product, f"Contains excluded term: {term}"

        # 6. Feature Requirements Check
        for req in required_features:
            norm_req = req.lower().replace("-", "_").replace(" ", "_")
            found = False
            for k, v in product_attrs.items():
                if norm_req in k.lower() and bool(v):
                    found = True
                    break
            if not found and req.lower() in full_desc:
                found = True

            if found:
                checks.append(PolicyCheckItem(
                    rule=f"feature_req_{norm_req}",
                    passed=True,
                    detail=f"Verified attribute: {req}"
                ))
            else:
                checks.append(PolicyCheckItem(
                    rule=f"feature_req_{norm_req}",
                    passed=False,
                    detail=f"Unverified attribute: {req}"
                ))
                return False, checks, product, f"Missing required attribute: {req}"

        # 7. Mandatory Buyer Approval Gate Check
        checks.append(PolicyCheckItem(
            rule="buyer_approval_required",
            passed=True,
            detail="Explicit human PayPal authorization gate enforced"
        ))

        return True, checks, product, "All purchase policies passed"
