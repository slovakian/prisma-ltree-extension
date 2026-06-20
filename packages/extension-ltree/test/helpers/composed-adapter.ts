import postgresRuntimeAdapterDescriptor from "@prisma-next/adapter-postgres/runtime";
import type {
  RuntimeExtensionDescriptor,
  RuntimeTargetDescriptor,
} from "@prisma-next/framework-components/execution";

const stubRuntimeTarget: RuntimeTargetDescriptor<"sql", "postgres"> = {
  kind: "target",
  id: "postgres",
  version: "0.0.1",
  familyId: "sql",
  targetId: "postgres",
  create() {
    return { familyId: "sql", targetId: "postgres" };
  },
};

/**
 * Build a stack-composed Postgres runtime adapter for tests that exercise
 * extension codecs (e.g. `pg/ltree@1`). The bare `createPostgresAdapter()`
 * factory cannot see extension codecs by design (ADR 205), so any test that
 * lowers a `ParamRef` carrying an extension-codec id must compose a stack
 * with the relevant extension pack(s). Mirrors the pgvector reference helper.
 */
export function createComposedPostgresAdapter(options: {
  readonly extensionPacks: readonly RuntimeExtensionDescriptor<"sql", "postgres">[];
}) {
  return postgresRuntimeAdapterDescriptor.create({
    target: stubRuntimeTarget,
    adapter: postgresRuntimeAdapterDescriptor,
    driver: undefined,
    extensionPacks: options.extensionPacks,
  });
}
