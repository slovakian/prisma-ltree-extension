#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma-next/postgres/migration";

export default class M extends Migration {
  override describe() {
    return {
      from: null,
      to: "sha256:f4aea48418f1aa74ecb60b8c675eb6b65c84ac2619cf0781f5acd6b4a1fa904a",
    };
  }

  override get operations() {
    return [
      this.installExtension({
        id: "ltree.install-ltree-extension",
        extensionName: "ltree",
        invariantId: "ltree:install-ltree-v1",
      }),
    ];
  }
}

void MigrationCLI.run(import.meta.url, M);
