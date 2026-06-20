import { PGlite } from "@electric-sql/pglite";
import { ltree as ltreeContrib } from "@electric-sql/pglite/contrib/ltree";
import type { PostgresContract } from "@prisma-next/adapter-postgres/types";
import { UNBOUND_DOMAIN_NAMESPACE_ID } from "@prisma-next/contract/types";
import { SqlContractSerializer } from "@prisma-next/family-sql/ir";
import { UNBOUND_NAMESPACE_ID } from "@prisma-next/framework-components/ir";
import {
  type AnyExpression,
  ColumnRef,
  OrderByItem,
  ProjectionItem,
  SelectAst,
  TableSource,
} from "@prisma-next/sql-relational-core/ast";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import ltreeRuntimeDescriptor from "../../src/exports/runtime";
import { createComposedPostgresAdapter } from "../helpers/composed-adapter";

/**
 * Capstone integration test for the first vertical slice: prove `isAncestorOf`
 * works end-to-end. The operation impl builds an `OperationExpr`, the composed
 * Postgres adapter lowers it to real Postgres-dialect SQL, and PGlite (with the
 * trusted `ltree` contrib extension) executes the lowered SQL against seeded
 * rows. This exercises the full pipeline: impl -> AST -> lowering -> execution.
 */

// A minimal contract declaring a `node(id int4, path ltree)` table so the
// renderer's codec lookup resolves `pg/ltree@1` -> native `ltree`.
const contract = new SqlContractSerializer().deserializeContract({
  target: "postgres",
  targetFamily: "sql",
  profileHash: "sha256:test-profile",
  roots: {},
  capabilities: {},
  extensionPacks: {},
  meta: {},
  storage: {
    storageHash: "sha256:test-core",
    namespaces: {
      [UNBOUND_NAMESPACE_ID]: {
        id: UNBOUND_NAMESPACE_ID,
        entries: {
          table: {
            node: {
              columns: {
                id: { codecId: "pg/int4@1", nativeType: "int4", nullable: false },
                path: { codecId: "pg/ltree@1", nativeType: "ltree", nullable: false },
              },
              uniques: [],
              indexes: [],
              foreignKeys: [],
            },
          },
        },
      },
    },
  },
  domain: { namespaces: { [UNBOUND_DOMAIN_NAMESPACE_ID]: { models: {} } } },
}) as PostgresContract;

// Wrap a `node.path` column as the codec-bound `self` expression the op impl expects.
function pathColumn(): AnyExpression {
  return {
    codec: { codecId: "pg/ltree@1" },
    returnType: { codecId: "pg/ltree@1", nullable: false },
    buildAst: () => ColumnRef.of("node", "path"),
  } as unknown as AnyExpression;
}

// Build `WHERE node.path @> $1` via the runtime descriptor's isAncestorOf impl.
function isAncestorOfWhere(value: string): AnyExpression {
  const op = ltreeRuntimeDescriptor.queryOperations!()["isAncestorOf"]!;
  const expr = op.impl(pathColumn() as never, value as never) as unknown as {
    buildAst(): AnyExpression;
  };
  return expr.buildAst();
}

describe("isAncestorOf — PGlite end-to-end", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite({ extensions: { ltree: ltreeContrib } });
    await db.exec("CREATE EXTENSION IF NOT EXISTS ltree;");
    await db.exec(`
      CREATE TABLE node (id int4 NOT NULL, path ltree NOT NULL);
      INSERT INTO node (id, path) VALUES
        (1, 'Top'),
        (2, 'Top.Science'),
        (3, 'Top.Science.Astronomy'),
        (4, 'Top.Art');
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  it('lowers to `"node"."path" @> $1::ltree` and selects the ancestor rows', async () => {
    const ast = SelectAst.from(TableSource.named("node"))
      .withProjection([ProjectionItem.of("id", ColumnRef.of("node", "id"))])
      .withWhere(isAncestorOfWhere("Top.Science"))
      .withOrderBy([OrderByItem.asc(ColumnRef.of("node", "id"))]);

    const adapter = createComposedPostgresAdapter({ extensionPacks: [ltreeRuntimeDescriptor] });
    const stmt = adapter.lower(ast, { contract });

    // Lowering produced the expected operator template against the bound
    // column, with the codec-driven `::ltree` cast on the parameter.
    expect(stmt.sql).toContain('"node"."path" @> $1::ltree');

    // Resolve the lowered params (all literals here) into wire values for PGlite.
    const params = stmt.params.map((p) => {
      if (p.kind === "literal") return p.value;
      throw new Error(`unexpected bind param: ${p.name}`);
    });
    expect(params).toEqual(["Top.Science"]);

    const result = await db.query<{ id: number }>(stmt.sql, params as unknown[]);
    // path @> 'Top.Science' selects rows whose path is an ancestor of (or equal
    // to) Top.Science: 'Top' (1) and 'Top.Science' (2).
    expect(result.rows.map((r) => r.id).sort((a, b) => a - b)).toEqual([1, 2]);
  });
});
