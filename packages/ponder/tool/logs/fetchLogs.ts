import type { JsonRpcProvider, Log } from "@ethersproject/providers";
import { BigNumber } from "ethers";

const fetchLogs = async (
  provider: JsonRpcProvider,
  contracts: string[],
  _fromBlock: number,
  _toBlock: number
) => {
  const historicalLogs: Log[] = [];

  let fromBlock = _fromBlock;
  const toBlock = _toBlock;

  while (fromBlock < toBlock) {
    const getLogsParams = {
      address: contracts,
      fromBlock: BigNumber.from(fromBlock).toHexString(),
    };

    const logs: Log[] = await provider.send("eth_getLogs", [getLogsParams]);

    if (logs.length > 0) {
      const lastLogInBatch = logs[logs.length - 1];
      const lastLogBlockNumber = BigNumber.from(
        lastLogInBatch.blockNumber
      ).toNumber();

      // If the last log block number is GTE endBlock, we're done.
      if (lastLogBlockNumber >= toBlock) {
        // TODO: maybe filter out duplicates? / handle this edge case better
        console.log("returning from fetchLogs, reached endBlock");
        break;
      }

      fromBlock = lastLogBlockNumber + 1;
    } else {
      // TODO: figure out what to safely do if there are not logs... are we done?
      // Probably depends on the RPC provider rules
      break;
    }

    historicalLogs.push(...logs);
  }

  return historicalLogs;
};

export { fetchLogs };
