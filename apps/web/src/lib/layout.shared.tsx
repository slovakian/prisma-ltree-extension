import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "prisma-ltree",
    },
    links: [
      {
        text: "Home",
        url: "/",
      },
      {
        text: "GitHub",
        url: "https://github.com/slovakian/prisma-ltree",
        external: true,
      },
    ],
  };
}
