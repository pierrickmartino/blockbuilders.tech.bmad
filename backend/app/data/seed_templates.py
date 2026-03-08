from datetime import datetime, timezone
from uuid import uuid4

import sqlalchemy as sa
from sqlmodel import Session
from app.data.strategy_templates import TEMPLATES


def seed_initial_templates(session: Session) -> None:
    """
    Seed initial strategy templates into the database.
    Idempotent: only inserts if table is empty.
    """
    bind = session.get_bind()
    metadata = sa.MetaData()
    templates_table = sa.Table("strategy_templates", metadata, autoload_with=bind)

    # Check if templates already exist
    existing = session.execute(sa.select(templates_table.c.id).limit(1)).first()
    if existing:
        print("Strategy templates already seeded, skipping.")
        return

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    available_columns = set(templates_table.columns.keys())
    bind_dialect = bind.dialect.name if bind is not None else ""
    use_string_uuid = bind_dialect == "sqlite"
    rows: list[dict] = []

    for template_data in TEMPLATES:
        row = {
            "id": str(uuid4()) if use_string_uuid else uuid4(),
            "name": template_data["name"],
            "description": template_data["description"],
            "logic_summary": template_data["logic_summary"],
            "use_cases": template_data["use_cases"],
            "parameter_ranges": template_data["parameter_ranges"],
            "definition_json": template_data["definition_json"],
            "source": template_data.get("source", "blockbuilders"),
            "status": template_data.get("status", "published"),
            "asset": template_data["asset"],
            "timeframe": template_data["timeframe"],
            "created_at": now,
            "updated_at": now,
        }

        # Include educational fields only when the current table schema supports them.
        for field_name in ("teaches_description", "difficulty", "sort_order"):
            if field_name in available_columns and field_name in template_data:
                row[field_name] = template_data[field_name]

        rows.append(row)

    session.execute(sa.insert(templates_table), rows)

    session.commit()
    print(f"Successfully seeded {len(TEMPLATES)} strategy templates.")
