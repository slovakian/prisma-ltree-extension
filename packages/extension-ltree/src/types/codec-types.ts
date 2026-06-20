import type { CodecTypes as CoreCodecTypes } from "../core/codecs";

export type Ltree = string & { readonly __ltree?: undefined };

export type CodecTypes = CoreCodecTypes;
