from redis import Redis
from rq import Worker, Queue
from app.core.config import settings

redis_conn = Redis.from_url(settings.redis_url)


def run_worker():
    queues = [Queue("default", connection=redis_conn)]
    worker = Worker(queues, connection=redis_conn)
    worker.work()


if __name__ == "__main__":
    run_worker()
