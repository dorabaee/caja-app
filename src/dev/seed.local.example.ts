import type { Seed } from "./seedData";

/**
 * Copy this file to `seed.local.ts` (gitignored) to test against your own books instead
 * of the fictional dataset. Nothing here reaches the repo, and it is only ever read by
 * `npm run dev:demo`.
 */
export const LOCAL_SEED: Seed = {
  projectName: "Mi negocio",
  months: [
    {
      monthIndex: 5, // 0 = enero
      tables: [
        {
          title: "Salida de Dinero",
          kind: "expense",
          moneyColumns: ["BANCOS", "NOMINAS", "PERSONAL"],
          rows: [
            {
              date: "2026-06-02",
              amounts: [3300, 1900, 9800],
              description: "Lo que compraste",
              category: "Material e insumos",
            },
          ],
        },
      ],
    },
  ],
};
