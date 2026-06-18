# Core vs Pack Entity Catalog

Source: prisma-next `docs/reference/Core vs Pack Entity Catalog.md`

Quick reference of which features live in core vs are provided by packs.

| Feature                     | In core | Capability keys | Contract shape location  | Notes                         |
| --------------------------- | ------- | --------------- | ------------------------ | ----------------------------- |
| Tables/Columns/PK/UK/FK     | Yes     | n/a             | `tables.*`               | Core                          |
| Basic indexes               | Yes     | n/a             | `tables.*.indexes[]`     | Core                          |
| Logical enums               | Yes     | n/a             | `enums[]`                | Core                          |
| Partial index predicate     | Pack    | `index.partial` | `indexes[].ext.<ns>`     | Extension                     |
| Geospatial types/ops        | Pack    | `postgis.*`     | `columns[].ext.postgis`  | postgis extension             |
| Vector types/ops            | Pack    | `pgvector.*`    | `columns[].ext.pgvector` | pgvector extension            |
| Hierarchy types/ops (ltree) | Pack    | `ltree.*`       | `columns[].ext.ltree`    | ltree extension (to be built) |

## Notes

- Capability keys are canonical; packs own namespaced keys
- Core never interprets unknown `ext` namespaces but preserves them deterministically
- The contract stays code-free and portable; packs supply runtime/tooling code at the edges
