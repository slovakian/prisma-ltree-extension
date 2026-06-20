import type { ColumnTypeDescriptor } from "@prisma-next/framework-components/codec";
import { LTREE_CODEC_ID } from "../core/constants";
import { LTREE_NATIVE_TYPE } from "../core/contract-space-constants";

export function ltree(): ColumnTypeDescriptor {
  return {
    codecId: LTREE_CODEC_ID,
    nativeType: LTREE_NATIVE_TYPE,
  } as const;
}
