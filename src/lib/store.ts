import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MarketSnapshot, PriceExecution, ProductMonitor } from "@/core/types";

export type StoreState = {
  products: ProductMonitor[];
  executions: PriceExecution[];
  marketSnapshots: MarketSnapshot[];
};

const emptyState = (): StoreState => ({
  products: [],
  executions: [],
  marketSnapshots: []
});

export class JsonProductStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<StoreState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as StoreState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return emptyState();
      }

      throw error;
    }
  }

  async write(state: StoreState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2));
  }
}
