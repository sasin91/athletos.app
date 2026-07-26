#!/usr/bin/env python3
"""Every operation in the OpenAPI document must carry a unique operationId.

Left off, utoipa derives one from the handler's function name — so two modules
that each have a `list` or a `show` produce colliding ids. That matters because
`openapi-typescript` keys its `operations` map on the id, and a collision makes
one operation generate with another operation's types. Phase 4 found
`GET /v1/programs` typed as the enrolment list this way, and
`GET /v1/workouts/{id}` generated with no path parameters at all.

This is deliberately a separate check from `oasdiff breaking`. Nothing about
the wire format changes when ids collide, so it is non-breaking by every
measure oasdiff has. It is a code-generation bug, not an API bug.
"""

import json
import sys
from collections import Counter

METHODS = {"get", "put", "post", "delete", "patch", "head", "options", "trace"}


def main(path: str) -> int:
    with open(path, encoding="utf-8") as handle:
        document = json.load(handle)

    missing: list[str] = []
    ids: list[str] = []

    for route, item in document.get("paths", {}).items():
        for method, operation in item.items():
            # A path item also holds keys like `parameters` and `summary`,
            # which are not operations and have no id to check.
            if method.lower() not in METHODS or not isinstance(operation, dict):
                continue

            operation_id = operation.get("operationId")
            if operation_id:
                ids.append(operation_id)
            else:
                missing.append(f"{method.upper()} {route}")

    failed = False

    for route in missing:
        print(f"::error::{route} has no operationId. Add "
              f"#[utoipa::path(operation_id = \"...\")].")
        failed = True

    for operation_id, count in sorted(Counter(ids).items()):
        if count > 1:
            print(f"::error::operationId {operation_id!r} is used {count} times. "
                  f"Give each operation an explicit, distinct id.")
            failed = True

    if failed:
        return 1

    print(f"{len(ids)} operations, all uniquely identified.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <openapi.json>", file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1]))
