import type { AuthoringTypeNamespace } from "@prisma-next/framework-components/authoring";
import { LTREE_CODEC_ID } from "./constants";
import { LTREE_NATIVE_TYPE } from "./contract-space-constants";

export const ltreeAuthoringTypes = {
  ltree: {
    Ltree: {
      kind: "typeConstructor",
      output: {
        codecId: LTREE_CODEC_ID,
        nativeType: LTREE_NATIVE_TYPE,
      },
    },
  },
} as const satisfies AuthoringTypeNamespace;
