# riao-iam - Changelog

## 5.0.0

- Add framework-neutral authentication rejection and block errors.
- Separate stored principals from authorization subjects, preserving rich
  attribute-policy types and supporting ID-only evaluation consistently.
- Define rejection versus operational-failure and protection-hook semantics.
- Document trusted request/session principals and client-safe denial reasons.

This release is coordinated with the authentication drivers, REST 3, and
api-machine 2. Publish the coordinated packages before installing from the
registry, then refresh dependent lockfiles to capture published integrity
metadata. Pending release entries intentionally contain no old integrity hash.
