import type { AnyExpression } from "@prisma-next/sql-relational-core/ast";
import {
  buildOperation,
  type CodecExpression,
  codecOf,
  type Expression,
  toExpr,
} from "@prisma-next/sql-relational-core/expression";
import type { CodecTypes } from "../types/codec-types";
import type { QueryOperationTypes } from "../types/operation-types";
import { ltreeAuthoringTypes } from "./authoring";
import { LTREE_CODEC_ID } from "./constants";
import { LTREE_NATIVE_TYPE } from "./contract-space-constants";
import { ltreeCodecRegistry } from "./registry";

type CodecTypesBase = Record<string, { readonly input: unknown; readonly output: unknown }>;

type BoolReturn = Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
type LtreeReturn = Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
type IntReturn = Expression<{ readonly codecId: "pg/int4@1"; readonly nullable: false }>;

const BOOL_RETURN = { codecId: "pg/bool@1", nullable: false } as const;
const LTREE_RETURN = { codecId: "pg/ltree@1", nullable: false } as const;
const INT_RETURN = { codecId: "pg/int4@1", nullable: false } as const;
const TEXT_CODEC_ID = "pg/text@1" as const;
const TEXT_ARRAY_CODEC_ID = "pg/text-array@1" as const;
const INT_CODEC_ID = "pg/int4@1" as const;

/**
 * Build a function-style operation whose SQL is `fnName(self, arg0, arg1, ...)`.
 * The template's placeholder count is derived from the actual argument list, so
 * one helper covers fixed-arity functions (`nlevel`, `subltree`), optional-arg
 * overloads (`subpath`, `index`), and the variadic `lca` (see ADR-001). `args`
 * already carries each value through `toExpr` with its codec; `args[0]` is the
 * `self` receiver.
 */
function funcOp<C extends string>(
  method: string,
  fnName: string,
  returns: { readonly codecId: C; readonly nullable: false },
  args: readonly [AnyExpression, ...AnyExpression[]],
): Expression<{ readonly codecId: C; readonly nullable: false }> {
  const placeholders = args.map((_, i) => (i === 0 ? "{{self}}" : `{{arg${i - 1}}}`)).join(", ");
  return buildOperation({
    method,
    args,
    returns,
    lowering: {
      targetFamily: "sql",
      strategy: "function",
      template: `${fnName}(${placeholders})`,
    },
  });
}

export function ltreeQueryOperations<CT extends CodecTypesBase>(): QueryOperationTypes<CT> {
  // Hierarchy operators compare two `ltree` values; the user argument shares the
  // column's `pg/ltree@1` codec. Pattern-match operators take a query/pattern
  // string (or `string[]`) that is NOT an ltree — it is bound as text and cast
  // in-template to `lquery` / `lquery[]` / `ltxtquery` (the validated-string-param
  // approach; verified executable under PGlite).
  const hierarchyOp = (
    method: string,
    operator: string,
    self: CodecExpression<typeof LTREE_CODEC_ID, boolean, CT>,
    other: CodecExpression<typeof LTREE_CODEC_ID, boolean, CT>,
  ): BoolReturn => {
    const selfCodec = codecOf(self);
    return buildOperation({
      method,
      args: [toExpr(self, selfCodec), toExpr(other, selfCodec)],
      returns: BOOL_RETURN,
      lowering: {
        targetFamily: "sql",
        strategy: "function",
        template: `{{self}} ${operator} {{arg0}}`,
      },
    });
  };

  const patternOp = (
    method: string,
    operator: string,
    castType: string,
    argCodecId: typeof TEXT_CODEC_ID | typeof TEXT_ARRAY_CODEC_ID,
    self: CodecExpression<typeof LTREE_CODEC_ID, boolean, CT>,
    arg: unknown,
  ): BoolReturn => {
    const selfCodec = codecOf(self);
    return buildOperation({
      method,
      args: [toExpr(self, selfCodec), toExpr(arg, { codecId: argCodecId })],
      returns: BOOL_RETURN,
      lowering: {
        targetFamily: "sql",
        strategy: "function",
        template: `{{self}} ${operator} ({{arg0}})::${castType}`,
      },
    });
  };

  return {
    isAncestorOf: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other) => hierarchyOp("isAncestorOf", "@>", self, other),
    },
    isDescendantOf: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other) => hierarchyOp("isDescendantOf", "<@", self, other),
    },
    matchesLquery: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, pattern) =>
        patternOp("matchesLquery", "~", "lquery", TEXT_CODEC_ID, self, pattern),
    },
    matchesLqueryArray: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, patterns) =>
        patternOp("matchesLqueryArray", "?", "lquery[]", TEXT_ARRAY_CODEC_ID, self, patterns),
    },
    matchesLtxtquery: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, query) =>
        patternOp("matchesLtxtquery", "@", "ltxtquery", TEXT_CODEC_ID, self, query),
    },
    nlevel: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self): IntReturn =>
        funcOp("nlevel", "nlevel", INT_RETURN, [toExpr(self, codecOf(self))]),
    },
    subltree: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, start, end): LtreeReturn =>
        funcOp("subltree", "subltree", LTREE_RETURN, [
          toExpr(self, codecOf(self)),
          toExpr(start, { codecId: INT_CODEC_ID }),
          toExpr(end, { codecId: INT_CODEC_ID }),
        ]),
    },
    // `subpath(self, offset, len?)` — `len` omitted lowers to the 2-arg overload.
    subpath: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, offset, len): LtreeReturn => {
        const head: readonly [AnyExpression, AnyExpression] = [
          toExpr(self, codecOf(self)),
          toExpr(offset, { codecId: INT_CODEC_ID }),
        ];
        return funcOp(
          "subpath",
          "subpath",
          LTREE_RETURN,
          len === undefined ? head : [...head, toExpr(len, { codecId: INT_CODEC_ID })],
        );
      },
    },
    // `index(self, other, offset?)` — `offset` omitted lowers to the 2-arg overload.
    indexOf: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other, offset): IntReturn => {
        const selfCodec = codecOf(self);
        const head: readonly [AnyExpression, AnyExpression] = [
          toExpr(self, selfCodec),
          toExpr(other, selfCodec),
        ];
        return funcOp(
          "indexOf",
          "index",
          INT_RETURN,
          offset === undefined ? head : [...head, toExpr(offset, { codecId: INT_CODEC_ID })],
        );
      },
    },
    // `lca(self, other, ...rest)` — variadic longest-common-ancestor (ADR-001).
    // PostgreSQL has no single-arg `lca`, so `other` is required (2–8 paths).
    lca: {
      self: { codecId: LTREE_CODEC_ID },
      impl: (self, other, ...rest): LtreeReturn => {
        const selfCodec = codecOf(self);
        return funcOp("lca", "lca", LTREE_RETURN, [
          toExpr(self, selfCodec),
          toExpr(other, selfCodec),
          ...rest.map((p) => toExpr(p, selfCodec)),
        ]);
      },
    },
  };
}

const ltreePackMetaBase = {
  kind: "extension",
  id: "ltree",
  familyId: "sql",
  targetId: "postgres",
  version: "0.1.0",
  capabilities: {
    postgres: {
      "ltree.path": true,
    },
  },
  authoring: {
    type: ltreeAuthoringTypes,
  },
  types: {
    codecTypes: {
      codecDescriptors: Array.from(ltreeCodecRegistry.values()),
      import: {
        package: "prisma-ltree/codec-types",
        named: "CodecTypes",
        alias: "LtreeTypes",
      },
      typeImports: [
        {
          package: "prisma-ltree/codec-types",
          named: "Ltree",
          alias: "Ltree",
        },
      ],
    },
    queryOperationTypes: {
      import: {
        package: "prisma-ltree/operation-types",
        named: "QueryOperationTypes",
        alias: "LtreeQueryOperationTypes",
      },
    },
    storage: [
      {
        typeId: LTREE_CODEC_ID,
        familyId: "sql",
        targetId: "postgres",
        nativeType: LTREE_NATIVE_TYPE,
      },
    ],
  },
} as const;

export const ltreePackMeta: typeof ltreePackMetaBase & {
  readonly __codecTypes?: CodecTypes;
} = ltreePackMetaBase;
