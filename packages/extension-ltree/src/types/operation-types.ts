import type { SqlQueryOperationTypes } from "@prisma-next/sql-contract/types";
import type { CodecExpression, Expression } from "@prisma-next/sql-relational-core/expression";

type CodecTypesBase = Record<string, { readonly input: unknown; readonly output: unknown }>;

export type QueryOperationTypes<CT extends CodecTypesBase> = SqlQueryOperationTypes<
  CT,
  {
    readonly isAncestorOf: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    readonly isDescendantOf: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    // Pattern-match operators: the argument is a query/pattern string (or
    // `string[]`), bound as text and cast in-template to lquery/ltxtquery — not
    // an ltree value.
    readonly matchesLquery: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        pattern: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    readonly matchesLqueryArray: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        patterns: CodecExpression<"pg/text-array@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    readonly matchesLtxtquery: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        query: CodecExpression<"pg/text@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
    };
    // Scalar functions.
    readonly nlevel: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/int4@1"; readonly nullable: false }>;
    };
    readonly subltree: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        start: CodecExpression<"pg/int4@1", boolean, CT>,
        end: CodecExpression<"pg/int4@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly subpath: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        offset: CodecExpression<"pg/int4@1", boolean, CT>,
        len?: CodecExpression<"pg/int4@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
    readonly indexOf: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
        offset?: CodecExpression<"pg/int4@1", boolean, CT>,
      ) => Expression<{ readonly codecId: "pg/int4@1"; readonly nullable: false }>;
    };
    // Variadic longest-common-ancestor on the first path (ADR-001). PostgreSQL's
    // positional `lca` has no single-argument form, so at least one `other` path
    // is required (total 2–8 paths).
    readonly lca: {
      readonly self: { readonly codecId: "pg/ltree@1" };
      readonly impl: (
        self: CodecExpression<"pg/ltree@1", boolean, CT>,
        other: CodecExpression<"pg/ltree@1", boolean, CT>,
        ...rest: ReadonlyArray<CodecExpression<"pg/ltree@1", boolean, CT>>
      ) => Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
    };
  }
>;
