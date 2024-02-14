import type { FunctionIds, TableIds } from "@/build/static/ids.js";
import type { Schema } from "@/schema/types.js";
import type { Checkpoint } from "@/utils/checkpoint.js";

export type Metadata = {
  functionId: string;
  fromCheckpoint: Checkpoint;
  toCheckpoint: Checkpoint;
  eventCount: number;
};

export interface DatabaseService {
  kind: "sqlite" | "postgres";

  metadata: Metadata[];

  setup(): Promise<void>;

  reset({
    schema,
    tableIds,
    functionIds,
  }: {
    schema: Schema;
    tableIds: TableIds;
    functionIds: FunctionIds;
  }): Promise<void>;

  kill(): Promise<void>;

  flush(metadata: Metadata[]): Promise<void>;

  publish(): Promise<void>;
}
