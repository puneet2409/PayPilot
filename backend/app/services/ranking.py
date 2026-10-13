from typing import List
from app.schemas.discovery import ProductItem
from app.schemas.agent import RankedCandidate, AgentIntent

class RankingEngine:
    @staticmethod
    def rank_candidates(
        candidates: List[ProductItem],
        intent: AgentIntent
    ) -> List[RankedCandidate]:
        ranked: List[RankedCandidate] = []
        budget = intent.budget or 999999.0

        for item in candidates:
            # Find best offer price
            offers = item.offers or []
            min_price = min((o.price for o in offers), default=0.0)
            best_merchant = offers[0].merchant if offers else "Retailer"
            buy_url = offers[0].buy_url if offers else None

            within_budget = min_price <= budget

            # Verified feature coverage
            attrs = item.attributes or {}
            verified = []
            unverified = []

            for req in intent.must_have:
                norm_req = req.lower().replace("-", "_").replace(" ", "_")
                found = False
                for k, v in attrs.items():
                    if norm_req in k.lower() and bool(v):
                        found = True
                        break
                if found or req.lower() in item.title.lower():
                    verified.append(req)
                else:
                    unverified.append(req)

            # Scoring factors (0 to 1)
            # M: preference match
            m_score = 0.9 if verified else 0.6
            # V: verified feature ratio
            total_reqs = len(intent.must_have) or 1
            v_score = len(verified) / total_reqs
            # P: price / budget value score (closer to budget = better value signal)
            p_score = (min_price / budget) if budget > 0 else 0.5
            p_score = min(1.0, p_score)
            # R: retailer evidence (more offers = higher confidence)
            r_score = min(1.0, len(offers) * 0.5)
            # D: data completeness
            d_score = 1.0 if (item.image_url and attrs) else 0.6

            # S(p) = 0.35M + 0.25V + 0.20P + 0.10R + 0.10D
            composite_score = (
                0.35 * m_score +
                0.25 * v_score +
                0.20 * p_score +
                0.10 * r_score +
                0.10 * d_score
            )

            # Over-budget offers stay visible as market intelligence but rank
            # below every affordable option; the deterministic policy engine
            # is what blocks the purchase at quote time.
            if not within_budget:
                composite_score *= 0.25

            budget_note = (
                ""
                if within_budget
                else f" Exceeds the ${budget:.2f} ceiling — the policy engine will refuse to issue a quote."
            )
            explanation = (
                f"Offered at ${min_price:.2f} by {best_merchant}. "
                f"Verified: {', '.join(verified) if verified else 'Standard specs'}. "
                f"{'Pending confirmation: ' + ', '.join(unverified) if unverified else 'All requirements satisfied.'}"
                f"{budget_note}"
            )

            ranked.append(RankedCandidate(
                product_id=item.product_id,
                title=item.title,
                brand=item.brand,
                price=min_price,
                currency=offers[0].currency if offers else "USD",
                rank=1,
                score=round(composite_score, 2),
                explanation=explanation,
                verified_features=verified,
                unverified_features=unverified,
                buy_url=buy_url,
                merchant=best_merchant,
                image_url=item.image_url,
                demo_sku=item.demo_sku,
                within_budget=within_budget
            ))

        # Sort by composite score descending
        ranked.sort(key=lambda x: x.score, reverse=True)
        for idx, c in enumerate(ranked):
            c.rank = idx + 1

        return ranked
