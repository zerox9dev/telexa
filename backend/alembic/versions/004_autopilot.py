"""autopilot settings

Revision ID: 004
Revises: 003
Create Date: 2026-05-09 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULTS = [
    ("autopilot_enabled", "false"),
    ("autopilot_interval_minutes", "30"),
    ("autopilot_rewrite", "true"),
    ("autopilot_publish", "true"),
]


def upgrade() -> None:
    settings = sa.table(
        "settings",
        sa.column("key", sa.String),
        sa.column("value", sa.Text),
        sa.column("updated_at", sa.DateTime),
    )
    op.bulk_insert(settings, [{"key": k, "value": v, "updated_at": None} for k, v in DEFAULTS])


def downgrade() -> None:
    op.execute("DELETE FROM settings WHERE key LIKE 'autopilot_%'")
