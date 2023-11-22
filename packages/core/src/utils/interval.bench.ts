import { bench, run } from "mitata";

import { BlockProgressTracker } from "./interval.js";

bench("BlockProgressTracker", () => {
  const tracker = new BlockProgressTracker();
  tracker.addPendingBlocks({ blockNumbers: [5, 6, 10] });

  tracker.addCompletedBlock({
    blockNumber: 6,
    blockTimestamp: 100,
  });

  tracker.addCompletedBlock({
    blockNumber: 5,
    blockTimestamp: 98,
  });

  tracker.addPendingBlocks({ blockNumbers: [11, 12, 15] });

  tracker.addCompletedBlock({
    blockNumber: 11,
    blockTimestamp: 115,
  });

  tracker.addCompletedBlock({ blockNumber: 12, blockTimestamp: 120 });

  tracker.addCompletedBlock({
    blockNumber: 10,
    blockTimestamp: 120,
  });
});

await run();
