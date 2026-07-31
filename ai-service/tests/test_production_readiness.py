"""Cross-cutting production-readiness contract tests."""

from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from app.main import app


def _health_request() -> dict[str, object]:
    """Issue an isolated health request for concurrency verification."""
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        return response.json()


def test_json_responses_include_standard_metadata() -> None:
    """Success and error responses expose correlation and timing metadata."""
    with TestClient(app) as client:
        success = client.get(
            "/api/v1/health",
            headers={"X-Request-ID": "readiness-test-001"},
        )
        error = client.get("/route-that-does-not-exist")

    assert success.headers["X-Request-ID"] == "readiness-test-001"
    assert success.json()["meta"]["request_id"] == "readiness-test-001"
    assert success.json()["meta"]["processing_time_ms"] >= 0
    assert error.json()["meta"]["request_id"]
    assert error.json()["meta"]["processing_time_ms"] >= 0


def test_invalid_caller_request_id_is_replaced() -> None:
    """Unsafe or undersized caller IDs are never propagated."""
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/health",
            headers={"X-Request-ID": "bad id"},
        )

    generated_id = response.json()["meta"]["request_id"]
    assert generated_id != "bad id"
    assert response.headers["X-Request-ID"] == generated_id


def test_concurrent_requests_have_independent_request_ids() -> None:
    """Concurrent calls retain independent request context."""
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda _: _health_request(), range(8)))

    request_ids = {
        str(result["meta"]["request_id"])  # type: ignore[index]
        for result in results
    }
    assert len(request_ids) == len(results)
