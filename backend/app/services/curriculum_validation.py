from typing import Any


def validate_registry(registry: dict[str, Any], known_template_names: set[str]) -> None:
    """Raise ValueError if the curriculum registry is not well-formed.

    Checks:
    - Every lesson references a known template name.
    - Lesson order values are unique within each module.
    - Module order values are unique across modules.
    - Each template name is assigned to at most one lesson.
    """
    module_orders: list[int] = []
    seen_templates: set[str] = set()

    for module in registry["modules"]:
        mod_order = module["order"]
        if mod_order in module_orders:
            raise ValueError(
                f"Duplicate module order {mod_order} in curriculum registry"
            )
        module_orders.append(mod_order)

        lesson_orders: list[int] = []
        for lesson in module["lessons"]:
            template_name = lesson["template_name"]
            if template_name not in known_template_names:
                raise ValueError(
                    f"Lesson '{lesson['id']}' references unknown template '{template_name}'"
                )
            if template_name in seen_templates:
                raise ValueError(
                    f"Template '{template_name}' is assigned to more than one lesson"
                )
            seen_templates.add(template_name)

            lesson_order = lesson["order"]
            if lesson_order in lesson_orders:
                raise ValueError(
                    f"Duplicate lesson order {lesson_order} in module '{module['id']}'"
                )
            lesson_orders.append(lesson_order)
