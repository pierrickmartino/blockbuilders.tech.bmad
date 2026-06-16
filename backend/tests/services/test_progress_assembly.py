"""Tests for the progress assembly pure function."""
import pytest

from app.data.curriculum_registry import CURRICULUM


# ── Slice 1: Zero completions ──────────────────────────────────────────────────


def test_zero_completions_overall_percent_is_zero():
    from app.services.progress_assembly import assemble_track_view

    view = assemble_track_view(set(), CURRICULUM)

    assert view.percent_complete == 0.0
    assert view.completed_lessons == 0


def test_zero_completions_total_lessons_is_twelve():
    from app.services.progress_assembly import assemble_track_view

    view = assemble_track_view(set(), CURRICULUM)

    assert view.total_lessons == 12


def test_zero_completions_resume_is_first_lesson():
    from app.services.progress_assembly import assemble_track_view

    view = assemble_track_view(set(), CURRICULUM)

    assert view.resume_lesson_id == "lesson-1-rsi"


def test_zero_completions_all_modules_at_zero_percent():
    from app.services.progress_assembly import assemble_track_view

    view = assemble_track_view(set(), CURRICULUM)

    for module in view.modules:
        assert module.percent_complete == 0.0
        assert module.completed_count == 0


def test_zero_completions_all_lessons_marked_incomplete():
    from app.services.progress_assembly import assemble_track_view

    view = assemble_track_view(set(), CURRICULUM)

    for module in view.modules:
        for lesson in module.lessons:
            assert lesson.completed is False


# ── Slice 2: Partial completions ──────────────────────────────────────────────


def test_partial_completions_first_module_percent():
    from app.services.progress_assembly import assemble_track_view

    # Complete 2 of 4 lessons in module 1
    completed = {"lesson-1-rsi", "lesson-2-ma-crossover"}
    view = assemble_track_view(completed, CURRICULUM)

    module_1 = next(m for m in view.modules if m.id == "module-1-foundations")
    assert module_1.completed_count == 2
    assert module_1.total_count == 4
    assert module_1.percent_complete == 50.0


def test_partial_completions_overall_percent():
    from app.services.progress_assembly import assemble_track_view

    completed = {"lesson-1-rsi", "lesson-2-ma-crossover"}
    view = assemble_track_view(completed, CURRICULUM)

    assert view.completed_lessons == 2
    assert view.percent_complete == pytest.approx(16.7, abs=0.1)


def test_partial_completions_resume_is_first_incomplete():
    from app.services.progress_assembly import assemble_track_view

    # Lessons 1 and 2 done; resume should be lesson 3
    completed = {"lesson-1-rsi", "lesson-2-ma-crossover"}
    view = assemble_track_view(completed, CURRICULUM)

    assert view.resume_lesson_id == "lesson-3-bollinger-breakout"


def test_partial_completions_lessons_marked_correctly():
    from app.services.progress_assembly import assemble_track_view

    completed = {"lesson-1-rsi", "lesson-5-macd-histogram"}
    view = assemble_track_view(completed, CURRICULUM)

    module_1 = next(m for m in view.modules if m.id == "module-1-foundations")
    module_2 = next(m for m in view.modules if m.id == "module-2-risk-drawdown")

    rsi_lesson = next(l for l in module_1.lessons if l.id == "lesson-1-rsi")
    ma_lesson = next(l for l in module_1.lessons if l.id == "lesson-2-ma-crossover")
    macd_lesson = next(l for l in module_2.lessons if l.id == "lesson-5-macd-histogram")

    assert rsi_lesson.completed is True
    assert ma_lesson.completed is False
    assert macd_lesson.completed is True


def test_resume_skips_completed_module_to_find_first_incomplete():
    from app.services.progress_assembly import assemble_track_view

    # All of module 1 done — resume should be first lesson of module 2
    module_1_ids = {
        "lesson-1-rsi",
        "lesson-2-ma-crossover",
        "lesson-3-bollinger-breakout",
        "lesson-4-ema-trend",
    }
    view = assemble_track_view(module_1_ids, CURRICULUM)

    assert view.resume_lesson_id == "lesson-5-macd-histogram"


# ── Slice 3: Full completions ──────────────────────────────────────────────────


def test_full_completions_overall_percent_is_hundred():
    from app.services.progress_assembly import assemble_track_view

    all_ids = {
        f"lesson-{i}-{slug}"
        for i, slug in [
            (1, "rsi"), (2, "ma-crossover"), (3, "bollinger-breakout"), (4, "ema-trend"),
            (5, "macd-histogram"), (6, "stochastic-oversold"), (7, "adx-directional"), (8, "price-variation"),
            (9, "stoch-rsi-double"), (10, "bollinger-rsi"), (11, "ema-rsi-confirm"), (12, "macd-adx-dual"),
        ]
    }
    view = assemble_track_view(all_ids, CURRICULUM)

    assert view.percent_complete == 100.0
    assert view.completed_lessons == 12


def test_full_completions_no_resume():
    from app.services.progress_assembly import assemble_track_view

    all_ids = {
        "lesson-1-rsi", "lesson-2-ma-crossover", "lesson-3-bollinger-breakout", "lesson-4-ema-trend",
        "lesson-5-macd-histogram", "lesson-6-stochastic-oversold", "lesson-7-adx-directional", "lesson-8-price-variation",
        "lesson-9-stoch-rsi-double", "lesson-10-bollinger-rsi", "lesson-11-ema-rsi-confirm", "lesson-12-macd-adx-dual",
    }
    view = assemble_track_view(all_ids, CURRICULUM)

    assert view.resume_lesson_id is None


def test_full_completions_all_modules_at_hundred_percent():
    from app.services.progress_assembly import assemble_track_view

    all_ids = {
        "lesson-1-rsi", "lesson-2-ma-crossover", "lesson-3-bollinger-breakout", "lesson-4-ema-trend",
        "lesson-5-macd-histogram", "lesson-6-stochastic-oversold", "lesson-7-adx-directional", "lesson-8-price-variation",
        "lesson-9-stoch-rsi-double", "lesson-10-bollinger-rsi", "lesson-11-ema-rsi-confirm", "lesson-12-macd-adx-dual",
    }
    view = assemble_track_view(all_ids, CURRICULUM)

    for module in view.modules:
        assert module.percent_complete == 100.0


# ── Structure ──────────────────────────────────────────────────────────────────


def test_modules_ordered_by_module_order():
    from app.services.progress_assembly import assemble_track_view

    view = assemble_track_view(set(), CURRICULUM)

    orders = [m.order for m in view.modules]
    assert orders == sorted(orders)


def test_lessons_within_module_ordered_by_lesson_order():
    from app.services.progress_assembly import assemble_track_view

    view = assemble_track_view(set(), CURRICULUM)

    for module in view.modules:
        orders = [l.order for l in module.lessons]
        assert orders == sorted(orders)
