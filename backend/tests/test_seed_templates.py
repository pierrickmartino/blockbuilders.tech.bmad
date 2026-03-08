from sqlmodel import Session, create_engine
from sqlalchemy.pool import StaticPool
import sqlalchemy as sa

from app.data.seed_templates import seed_initial_templates
from app.data.strategy_templates import TEMPLATES


def _create_strategy_templates_table(engine, include_educational_fields: bool) -> sa.Table:
    metadata = sa.MetaData()
    columns = [
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("logic_summary", sa.String(length=500), nullable=False),
        sa.Column("use_cases", sa.JSON(), nullable=False),
        sa.Column("parameter_ranges", sa.JSON(), nullable=False),
        sa.Column("definition_json", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("asset", sa.String(), nullable=False),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]
    if include_educational_fields:
        columns.extend(
            [
                sa.Column("teaches_description", sa.Text(), nullable=True),
                sa.Column("difficulty", sa.String(), nullable=False),
                sa.Column("sort_order", sa.Integer(), nullable=False),
            ]
        )

    table = sa.Table("strategy_templates", metadata, *columns)
    metadata.create_all(engine)
    return table


def _make_engine():
    return create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def test_seed_initial_templates_handles_pre_029_schema():
    engine = _make_engine()
    table = _create_strategy_templates_table(engine, include_educational_fields=False)

    with Session(engine) as session:
        seed_initial_templates(session)
        seed_initial_templates(session)

        count = session.execute(
            sa.select(sa.func.count()).select_from(table)
        ).scalar_one()
        assert count == len(TEMPLATES)


def test_seed_initial_templates_populates_educational_fields_when_available():
    engine = _make_engine()
    table = _create_strategy_templates_table(engine, include_educational_fields=True)

    with Session(engine) as session:
        seed_initial_templates(session)

        row = session.execute(
            sa.select(
                table.c.teaches_description,
                table.c.difficulty,
                table.c.sort_order,
            ).where(table.c.name == "RSI Oversold Bounce")
        ).one()

    assert row.teaches_description is not None
    assert row.difficulty == "beginner"
    assert row.sort_order == 1
