"""S3/MinIO storage client for backtest results."""
import json
from typing import Any
from uuid import UUID

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


def get_s3_client():
    """Create boto3 S3 client configured for MinIO."""
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    )


def ensure_bucket_exists() -> None:
    """Create bucket if it doesn't exist."""
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket_name)
    except ClientError:
        client.create_bucket(Bucket=settings.s3_bucket_name)


def generate_results_key(run_id: UUID, filename: str) -> str:
    """Generate storage key: backtests/{run_id}/{filename}"""
    return f"backtests/{run_id}/{filename}"


def upload_json(key: str, data: Any) -> str:
    """Upload JSON data to S3, return key."""
    ensure_bucket_exists()
    client = get_s3_client()
    json_bytes = json.dumps(data).encode("utf-8")
    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=json_bytes,
        ContentType="application/json",
    )
    return key


def download_json(key: str) -> Any:
    """Download and parse JSON from S3."""
    client = get_s3_client()
    response = client.get_object(Bucket=settings.s3_bucket_name, Key=key)
    return json.loads(response["Body"].read().decode("utf-8"))
