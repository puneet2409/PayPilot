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
        budget = intent.budget if intent.budget is not None else 999999.0

        for item in candidates:
            # Rank and link to the same currently purchasable offer. Never turn
            # an empty/unavailable offer list into a misleading $0 candidate.
            offers = [
                offer for offer in (item.offers or [])
                if offer.price > 0 and offer.availability.strip().lower() in {
                    "in stock", "instock", "available", "in_stock"
                }
                and offer.currency.upper() == intent.currency.upper()
            ]
            if not offers:
                continue
            best_offer = min(offers, key=lambda offer: offer.price)
            min_price = best_offer.price
            best_merchant = best_offer.merchant
            buy_url = best_offer.buy_url

            within_budget = min_price <= budget

            # Verified feature coverage
            attrs = item.attributes or {}
            verified = []
            unverified = []
            item_evidence = f"{item.title} {item.brand or ''} {attrs}".casefold().replace("-", " ").replace("_", " ")
            preference_matches = [
                preference for preference in intent.preferences
                if preference.casefold().replace("-", " ").replace("_", " ") in item_evidence
            ]

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
            m_score = (
                len(preference_matches) / len(intent.preferences)
                if intent.preferences
                else (0.9 if verified else 0.6)
            )
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
            price_source = "PayPilot demo-store price" if item.source == "demo_catalogue" else "Retailer offer"
            explanation = (
                f"{price_source}: ${min_price:.2f} from {best_merchant}. "
                f"Verified: {', '.join(verified) if verified else 'Standard specs'}. "
                f"{'Pending confirmation: ' + ', '.join(unverified) if unverified else 'All requirements satisfied.'}"
                f"{' Matched preferences: ' + ', '.join(preference_matches) + '.' if preference_matches else ''}"
                f"{budget_note}"
            )

            ranked.append(RankedCandidate(
                product_id=item.product_id,
                title=item.title,
                brand=item.brand,
                price=min_price,
                currency=best_offer.currency,
                rank=1,
                score=round(composite_score, 2),
                explanation=explanation,
                verified_features=verified,
                unverified_features=unverified,
                buy_url=buy_url,
                merchant=best_merchant,
                offers=offers,
                image_url=item.image_url,
                demo_sku=item.demo_sku,
                source=item.source,
                within_budget=within_budget
            ))

        # Sort by composite score descending
        ranked.sort(key=lambda x: x.score, reverse=True)
        for idx, c in enumerate(ranked):
            c.rank = idx + 1

        return ranked
