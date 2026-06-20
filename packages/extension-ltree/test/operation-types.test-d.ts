import type { Expression } from "@prisma-next/sql-relational-core/expression";
import { expectTypeOf, test } from "vite-plus/test";
import type { QueryOperationTypes } from "../src/exports/operation-types";

// A codec-types map covering every codec the Tier 1 operations reference, so the
// `CodecExpression` argument types resolve to their raw-value forms.
type TestCT = {
  "pg/ltree@1": { input: string; output: string };
  "pg/text@1": { input: string; output: string };
  "pg/text-array@1": { input: string[]; output: string[] };
  "pg/int4@1": { input: number; output: number };
  "pg/bool@1": { input: boolean; output: boolean };
};

type Ops = QueryOperationTypes<TestCT>;

type Impl<K extends keyof Ops> = Ops[K]["impl"];
type ArgOf<K extends keyof Ops, I extends number> = Parameters<Impl<K>>[I];
type BoolReturn = Expression<{ readonly codecId: "pg/bool@1"; readonly nullable: false }>;
type LtreeReturn = Expression<{ readonly codecId: "pg/ltree@1"; readonly nullable: false }>;
type IntReturn = Expression<{ readonly codecId: "pg/int4@1"; readonly nullable: false }>;

test("the full Tier 1 operation set is present", () => {
  expectTypeOf<keyof Ops>().toEqualTypeOf<
    | "isAncestorOf"
    | "isDescendantOf"
    | "matchesLquery"
    | "matchesLqueryArray"
    | "matchesLtxtquery"
    | "nlevel"
    | "subltree"
    | "subpath"
    | "indexOf"
    | "lca"
  >();
});

test("hierarchy operators take an ltree arg and return bool", () => {
  expectTypeOf<ReturnType<Impl<"isAncestorOf">>>().toEqualTypeOf<BoolReturn>();
  expectTypeOf<ReturnType<Impl<"isDescendantOf">>>().toEqualTypeOf<BoolReturn>();
  // The other path accepts a raw ltree string.
  expectTypeOf<string>().toExtend<ArgOf<"isAncestorOf", 1>>();
});

test("pattern-match operators take text / text[] args and return bool", () => {
  expectTypeOf<ReturnType<Impl<"matchesLquery">>>().toEqualTypeOf<BoolReturn>();
  expectTypeOf<ReturnType<Impl<"matchesLtxtquery">>>().toEqualTypeOf<BoolReturn>();
  expectTypeOf<ReturnType<Impl<"matchesLqueryArray">>>().toEqualTypeOf<BoolReturn>();
  expectTypeOf<string>().toExtend<ArgOf<"matchesLquery", 1>>();
  expectTypeOf<string[]>().toExtend<ArgOf<"matchesLqueryArray", 1>>();
});

test("scalar functions return ltree or int4", () => {
  expectTypeOf<ReturnType<Impl<"nlevel">>>().toEqualTypeOf<IntReturn>();
  expectTypeOf<ReturnType<Impl<"indexOf">>>().toEqualTypeOf<IntReturn>();
  expectTypeOf<ReturnType<Impl<"subltree">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"subpath">>>().toEqualTypeOf<LtreeReturn>();
  expectTypeOf<ReturnType<Impl<"lca">>>().toEqualTypeOf<LtreeReturn>();
});

test("subpath length and indexOf offset are optional, lca requires >= 2 paths", () => {
  // subpath: (self, offset) and (self, offset, len) both valid.
  expectTypeOf<Impl<"subpath">>().toBeCallableWith(undefined as never, undefined as never);
  // indexOf offset optional.
  expectTypeOf<Impl<"indexOf">>().toBeCallableWith(undefined as never, undefined as never);
  // lca needs self + at least one other (two required params).
  expectTypeOf<Parameters<Impl<"lca">>["length"]>().toExtend<number>();
  expectTypeOf<ArgOf<"lca", 1>>().not.toBeUndefined();
});
