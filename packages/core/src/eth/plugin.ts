/**
- key/id (eth)
- Config type
- Generic that goes from config values -> event types
- async setup callback, gets database URL?
- setup, start, kill, reload
- Must implement
    - Event checkpoint getter
    - Get events method? How to specify all that incredible detail of this API? Ooooh. It doesn't need to.
    The plugin itself already has all the users sources. So this API can literally just be from/to. Holy shit.
 */

import type { Common } from "@/Ponder.js";
import type { StoreConfig } from "@/config/database.js";
import type { Network } from "@/config/networks.js";
import type { Source } from "@/config/sources.js";
import { SyncGateway } from "@/sync-gateway/service.js";
import { HistoricalSyncService } from "@/sync-historical/service.js";
import { RealtimeSyncService } from "@/sync-realtime/service.js";
import { PostgresSyncStore } from "@/sync-store/postgres/store.js";
import { SqliteSyncStore } from "@/sync-store/sqlite/store.js";
import type { SyncStore } from "@/sync-store/store.js";
import type { Checkpoint } from "@/utils/checkpoint.js";
import type { Hex } from "viem";

export class EventSourcePlugin {
  key = "eth";

  private common: Common;
  private store: SyncStore;

  private networkServices: {
    network: Network;
    sources: Source[];
    historical: HistoricalSyncService;
    realtime: RealtimeSyncService;
  }[] = [];
  private gateway: SyncGateway = null!;

  constructor(common: Common, store: StoreConfig) {
    this.common = common;
    this.store =
      store.kind === "sqlite"
        ? new SqliteSyncStore({ common: this.common, file: store.file })
        : new PostgresSyncStore({ common: this.common, pool: store.pool });
  }

  async setup({
    sources,
    networks,
  }: {
    // TODO: This will be the raw plugin-specific config.
    // Validation will happen here in the plugin.
    sources: Source[];
    networks: Network[];
  }) {
    const networksToSync = networks.filter((network) => {
      const hasSources = sources.some(
        (source) => source.networkName === network.name,
      );
      if (!hasSources) {
        this.common.logger.warn({
          service: "eth",
          msg: `No contracts found (network=${network.name})`,
        });
      }
      return hasSources;
    });

    this.networkServices = networksToSync.map((network) => {
      const sourcesForNetwork = sources.filter(
        (source) => source.networkName === network.name,
      );

      return {
        network,
        sources: sourcesForNetwork,
        historical: new HistoricalSyncService({
          common: this.common,
          syncStore: this.store,
          network,
          sources: sourcesForNetwork,
        }),
        realtime: new RealtimeSyncService({
          common: this.common,
          syncStore: this.store,
          network,
          sources: sourcesForNetwork,
        }),
      };
    });

    this.gateway = new SyncGateway({
      common: this.common,
      syncStore: this.store,
      networks: networksToSync,
      sources: sources,
    });

    this.networkServices.forEach(({ network, historical, realtime }) => {
      historical.on("historicalCheckpoint", (checkpoint) => {
        this.gateway.handleNewHistoricalCheckpoint(checkpoint);
      });

      historical.on("syncComplete", () => {
        this.gateway.handleHistoricalSyncComplete({
          chainId: network.chainId,
        });
      });

      realtime.on("realtimeCheckpoint", (checkpoint) => {
        this.gateway.handleNewRealtimeCheckpoint(checkpoint);
      });

      realtime.on("finalityCheckpoint", (checkpoint) => {
        this.gateway.handleNewFinalityCheckpoint(checkpoint);
      });

      realtime.on("shallowReorg", (checkpoint) => {
        this.gateway.handleReorg(checkpoint);
      });
    });

    await this.store.migrateUp();

    try {
      await Promise.all(
        this.networkServices.map(async ({ historical, realtime }) => {
          const blockNumbers = await realtime.setup();
          await historical.setup(blockNumbers);
          historical.start();
          await realtime.start();
        }),
      );
    } catch (error_) {
      const error = error_ as Error;
      error.stack = undefined;
    }
  }

  async kill() {
    this.gateway.clearListeners();
    this.networkServices.forEach(({ realtime, historical }) => {
      realtime.clearListeners();
      historical.clearListeners();
    });

    await Promise.all(
      this.networkServices.map(async ({ realtime, historical }) => {
        await realtime.kill();
        await historical.kill();
      }),
    );

    await this.store.kill();
  }

  checkpoint() {
    return this.gateway.checkpoint;
  }

  getEvents({
    fromCheckpoint,
    toCheckpoint,
    includeEventSelectors,
  }: {
    fromCheckpoint: Checkpoint;
    toCheckpoint: Checkpoint;
    includeEventSelectors: { [sourceId: string]: Hex[] };
  }) {
    return this.gateway.getEvents({
      fromCheckpoint,
      toCheckpoint,
      // TODO: Figure out what to do here.
      includeEventSelectors,
    });
  }
}
