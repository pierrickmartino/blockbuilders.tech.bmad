from sqlmodel import Session, select
from app.models.strategy_template import StrategyTemplate
from app.data.strategy_templates import TEMPLATES


def seed_initial_templates(session: Session) -> None:
    """
    Seed initial strategy templates into the database.
    Idempotent: only inserts if table is empty.
    """
    # Check if templates already exist
    existing = session.exec(select(StrategyTemplate)).first()
    if existing:
        print("Strategy templates already seeded, skipping.")
        return

    # Insert all templates
    for template_data in TEMPLATES:
        template = StrategyTemplate(**template_data)
        session.add(template)

    session.commit()
    print(f"Successfully seeded {len(TEMPLATES)} strategy templates.")
