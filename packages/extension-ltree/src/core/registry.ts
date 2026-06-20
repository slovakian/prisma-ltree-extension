import { buildCodecDescriptorRegistry } from "@prisma-next/sql-relational-core/codec-descriptor-registry";
import type { CodecDescriptorRegistry } from "@prisma-next/sql-relational-core/query-lane-context";
import { codecDescriptors } from "./codecs";

export const ltreeCodecRegistry: CodecDescriptorRegistry =
  buildCodecDescriptorRegistry(codecDescriptors);
