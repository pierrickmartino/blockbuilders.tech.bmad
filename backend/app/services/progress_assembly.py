"""Pure progress assembly: turns a set of completed lesson IDs + the curriculum into a TrackView."""
from app.schemas.track import TrackLesson, TrackModule, TrackView


def assemble_track_view(completed_lesson_ids: set[str], curriculum: dict) -> TrackView:
    """Compute per-module and overall completion from completed IDs and the curriculum registry.

    Navigation is open — all lessons appear regardless of completion status.
    The resume pointer is the first incomplete lesson in module/sort order; None when fully complete.
    """
    modules: list[TrackModule] = []
    total_lessons = 0
    completed_lessons = 0
    resume_lesson_id: str | None = None

    for module_data in sorted(curriculum["modules"], key=lambda m: m["order"]):
        module_completed = 0
        track_lessons: list[TrackLesson] = []

        for lesson_data in sorted(module_data["lessons"], key=lambda l: l["order"]):
            is_complete = lesson_data["id"] in completed_lesson_ids
            if is_complete:
                module_completed += 1
            elif resume_lesson_id is None:
                resume_lesson_id = lesson_data["id"]

            track_lessons.append(
                TrackLesson(
                    id=lesson_data["id"],
                    title=lesson_data["title"],
                    order=lesson_data["order"],
                    completed=is_complete,
                )
            )

        lesson_count = len(module_data["lessons"])
        total_lessons += lesson_count
        completed_lessons += module_completed

        module_pct = round(module_completed / lesson_count * 100, 1) if lesson_count else 0.0

        modules.append(
            TrackModule(
                id=module_data["id"],
                title=module_data["title"],
                order=module_data["order"],
                lessons=track_lessons,
                completed_count=module_completed,
                total_count=lesson_count,
                percent_complete=module_pct,
            )
        )

    overall_pct = round(completed_lessons / total_lessons * 100, 1) if total_lessons else 0.0

    return TrackView(
        modules=modules,
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        percent_complete=overall_pct,
        resume_lesson_id=resume_lesson_id,
    )
