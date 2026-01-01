import sys

from redis import Redis
from rq import Worker, Queue
from rq_scheduler import Scheduler

from app.core.config import settings

redis_conn = Redis.from_url(settings.redis_url)


def run_worker():
    """Run the RQ worker to process jobs."""
    queues = [Queue("default", connection=redis_conn)]
    worker = Worker(queues, connection=redis_conn)
    worker.work()


def run_scheduler():
    """Run the scheduler for periodic jobs."""
    scheduler = Scheduler(connection=redis_conn)

    # Schedule daily auto-update job at configured hour (default 02:00 UTC)
    scheduler.cron(
        f"0 {settings.scheduler_hour_utc} * * *",  # Cron expression: minute hour day month weekday
        func="app.worker.jobs.auto_update_strategies_daily",
        queue_name="default",
    )

    # Schedule daily data quality validation job at 03:00 UTC (after auto-update)
    scheduler.cron(
        "0 3 * * *",  # Cron expression: 03:00 UTC daily
        func="app.worker.jobs.validate_data_quality_daily",
        queue_name="default",
    )

    print(f"Scheduler started. Daily auto-update job scheduled at {settings.scheduler_hour_utc}:00 UTC, data quality validation at 03:00 UTC")
    scheduler.run()


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "worker"

    if mode == "scheduler":
        run_scheduler()
    else:
        run_worker()
