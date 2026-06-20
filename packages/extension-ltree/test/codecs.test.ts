import { describe, expect, it } from "vite-plus/test";
import { ltree, ltreeDescriptor, assertValidLtree } from "../src/core/codecs";
import { LTREE_CODEC_ID, LTREE_MAX_LABEL_LENGTH } from "../src/core/constants";

type AsyncLtreeCodec = {
  readonly encode: (value: string) => Promise<string>;
  readonly decode: (wire: string) => Promise<string>;
};

function asAsyncCodec(): AsyncLtreeCodec {
  return ltreeDescriptor.factory()({ name: "test" }) as unknown as AsyncLtreeCodec;
}

describe("prisma-ltree codecs", () => {
  it("has ltree codec registered with correct metadata", () => {
    expect(ltreeDescriptor.codecId).toBe(LTREE_CODEC_ID);
    expect(ltreeDescriptor.targetTypes).toEqual(["ltree"]);
    expect(ltreeDescriptor.traits).toEqual(["equality", "order"]);
  });

  it("encodes a valid label path unchanged", async () => {
    const codec = asAsyncCodec();
    const value = "Top.Science.Astronomy";
    const encoded = await codec.encode(value);
    expect(encoded).toBe(value);
  });

  it("decodes a wire string unchanged", async () => {
    const codec = asAsyncCodec();
    const wire = "Top.Countries.Europe.Russia";
    const decoded = await codec.decode(wire);
    expect(decoded).toBe(wire);
  });

  it("round-trips encode/decode preserving the value", async () => {
    const codec = asAsyncCodec();
    const original = "Top.Science.Astronomy.Cosmology";
    const encoded = await codec.encode(original);
    expect(encoded).toBe(original);
    const decoded = await codec.decode(encoded);
    expect(decoded).toEqual(original);
  });

  it("encodes a single-label path", async () => {
    const codec = asAsyncCodec();
    const encoded = await codec.encode("Top");
    expect(encoded).toBe("Top");
  });

  it("encodes labels with underscores and hyphens", async () => {
    const codec = asAsyncCodec();
    const encoded = await codec.encode("my_label.hyphen-label.123");
    expect(encoded).toBe("my_label.hyphen-label.123");
  });
});

describe("prisma-ltree codec validation", () => {
  it("rejects non-string values", async () => {
    const codec = asAsyncCodec();
    await expect(codec.encode(123 as unknown as string)).rejects.toThrow(
      "ltree value must be a string",
    );
  });

  it("rejects empty strings", async () => {
    const codec = asAsyncCodec();
    await expect(codec.encode("")).rejects.toThrow("ltree value must not be empty");
  });

  it("rejects labels with dots resulting in empty segments", async () => {
    const codec = asAsyncCodec();
    await expect(codec.encode("Top..Science")).rejects.toThrow("ltree label must not be empty");
    await expect(codec.encode(".Top")).rejects.toThrow("ltree label must not be empty");
    await expect(codec.encode("Top.")).rejects.toThrow("ltree label must not be empty");
  });

  it("rejects labels with invalid characters", async () => {
    const codec = asAsyncCodec();
    await expect(codec.encode("Top.Sc ience")).rejects.toThrow("invalid characters");
    await expect(codec.encode("Top.Science!")).rejects.toThrow("invalid characters");
    await expect(codec.encode("Top.Sc/ience")).rejects.toThrow("invalid characters");
  });

  it("rejects labels exceeding the max length", async () => {
    const codec = asAsyncCodec();
    const longLabel = "a".repeat(LTREE_MAX_LABEL_LENGTH + 1);
    await expect(codec.encode(longLabel)).rejects.toThrow("exceeds max length");
  });

  it("accepts a label at exactly the max length", async () => {
    const codec = asAsyncCodec();
    const maxLabel = "a".repeat(LTREE_MAX_LABEL_LENGTH);
    const encoded = await codec.encode(maxLabel);
    expect(encoded).toBe(maxLabel);
  });

  it("assertValidLtree throws for invalid input", () => {
    expect(() => assertValidLtree(undefined as unknown as string)).toThrow(
      "ltree value must be a string",
    );
    expect(() => assertValidLtree("good.path")).not.toThrow();
  });
});

describe("ltree column helper", () => {
  it("produces a ColumnSpec with the codec id and ltree nativeType", () => {
    const spec = ltree();
    expect(spec.codecId).toBe(LTREE_CODEC_ID);
    expect(spec.nativeType).toBe("ltree");
    expect(spec.typeParams).toBeUndefined();
  });

  it("produces a codec factory that materializes a working LtreeCodec", async () => {
    const spec = ltree();
    const codec = spec.codecFactory({ name: "path" }) as unknown as AsyncLtreeCodec;
    expect(await codec.encode("Top.Child")).toBe("Top.Child");
  });
});
