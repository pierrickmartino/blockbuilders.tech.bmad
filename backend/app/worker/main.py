import sys
import logging

from redis import Redis
from rq import Worker, Queue
from rq_scheduler import Scheduler

from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

redis_conn = Redis.from_url(settings.redis_url)


def run_worker():
    """Run the RQ worker to process jobs."""
    queues = [Queue("default", connection=redis_conn)]
    worker = Worker(queues, connection=redis_conn)
    worker.work()


def run_scheduler():
    """Run the scheduler for periodic jobs."""
    logger.info("Initializing scheduler...")

    scheduler = Scheduler(connection=redis_conn)

    # Cancel existing scheduled jobs to avoid duplicates on restart
    for job in scheduler.get_jobs():
        job_id = job.id if hasattr(job, "id") else str(job)
        if job_id in ["auto_update_daily", "data_quality_daily"]:
            logger.info(f"Removing existing scheduled job: {job_id}")
            scheduler.cancel(job)

    # Schedule daily auto-update job at configured hour (default 02:00 UTC)
    scheduler.cron(
        f"0 {settings.scheduler_hour_utc} * * *",  # Cron expression: minute hour day month weekday
        func="app.worker.jobs.auto_update_strategies_daily",
        queue_name="default",
        id="auto_update_daily",
    )
    logger.info(f"Registered auto_update_daily cron job at {settings.scheduler_hour_utc}:00 UTC")

    # Schedule daily data quality validation job at 03:00 UTC (after auto-update)
    scheduler.cron(
        "0 3 * * *",  # Cron expression: 03:00 UTC daily
        func="app.worker.jobs.validate_data_quality_daily",
        queue_name="default",
        id="data_quality_daily",
    )
    logger.info("Registered data_quality_daily cron job at 03:00 UTC")

    logger.info("Scheduler started successfully. Waiting for scheduled jobs...")
    scheduler.run()


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "worker"

    # Verify Redis connection before starting
    try:
        redis_conn.ping()
        logger.info(f"Connected to Redis at {settings.redis_url}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        sys.exit(1)

    if mode == "scheduler":
        run_scheduler()
    else:
        run_worker()
