import { FetchOptions, FetchResultVolume } from "../../adapters/types";

const vault_factory = "0x984e0eb8fb687afa53fc8b33e12e04967560e092";
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const event_deposit = "event Deposit (address indexed user, address indexed receiver, uint256 id, uint256 assets)";

const abis: any = {
  "getVaults": "function getVaults(uint256 index) view returns (address[] vaults)",
  "marketIndex": "uint256:marketIndex"
};

const fetch: any = async (timestamp: number, _, { api, getLogs, createBalances, }: FetchOptions): Promise<FetchResultVolume> => {
  const vaults = (await api.fetchList({ lengthAbi: abis.marketIndex, itemAbi: abis.getVaults, target: vault_factory })).flat()
  const dailyVolume = createBalances()
  const logs_deposit = await getLogs({ targets: vaults, eventAbi: event_deposit, })
  logs_deposit.forEach((log: any) => dailyVolume.add(WETH, log.amount))

  return { dailyVolume, timestamp, };
};

export default fetch;
