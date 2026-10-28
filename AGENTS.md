# Repository coding rules

These rules apply to all code changes in this repository, including Python,
React, scenario configuration, persistence and migrations.

## Strictly avoid silent fallbacks

Missing, invalid, incompatible or unexpected data must produce a clear,
actionable error. Do not conceal it by substituting another value, skipping work
or returning a result that looks successful.

In particular:

- Do not use hardcoded substitutes for required configuration or state, such as
  `settings.get("default_parcel_area", 4500)`, `value or default`, or
  `value ?? default` when the value is required by the contract.
- Do not replace failed reads, requests, validation or calculations with empty
  collections, zero, `null`, stale data or fabricated success.
- Do not swallow exceptions, silently ignore unsupported fields or silently
  drop actions that cannot be replayed. Dependency removal is allowed only as
  an explicit editing operation whose preview lists the affected choices and
  reasons before confirmation.
- Do not silently try a different file, configuration, implementation or data
  source when the intended one is unavailable.
- Do not guess a save version or repair missing fields implicitly during normal
  execution. Use explicit, validated, version-specific migrations. Unsupported
  or malformed saves must be rejected without replacing the existing save.
- Do not hide an API/frontend incompatibility by rendering plausible substitute
  values or omitting required controls. Show the incompatibility and the action
  needed to resolve it.

### Defaults, optional values and recovery

Form defaults are intentional product inputs, not substitutes for broken data.
Define them in the authoritative configuration, validate them, and apply them
explicitly when creating a draft. Required defaults must not be duplicated as
fallback constants elsewhere.

Optional fields must have an explicit contract: what absence means, which
values are valid, and how absence is represented. Preserve distinctions between
missing, unknown, zero, empty and false. A documented optional value does not
justify treating required data as optional.

Recovery must be explicit and visible. Preserve the last confirmed project and
the user's draft when an operation fails; show the error and provide an explicit
retry or recovery action. Logging a problem alone does not justify substituting
behavior or values.

### Implementation and review

1. Identify required inputs and validate them at the appropriate boundary.
2. Propagate failures with useful context; present them clearly in the UI.
3. Keep failed mutations atomic: no partial state changes or successful-looking
   response after failure.
4. When behavior needs tests, check failure paths as well as successful inputs:
   missing configuration, malformed data, unsupported versions and failed I/O.
5. Treat existing silent fallbacks as defects. Remove those in a changed code
   path within the task's scope and explicitly identify remaining ones; do not
   copy them into new code or claim the repository is compliant without an audit.

These rules are mandatory for future changes. They do not imply that existing
code has already been audited or corrected.

The current audit scope, JSON configuration layout and intentional optional or
legacy cases are documented in `restoration_simulator/FALLBACK_AUDIT.md`. Preserve
the frozen replay contracts; do not use their historical prefills as a reason
to reintroduce silent recovery into current code.
