import * as sdk from "@defillama/sdk";
import { Adapter, ChainBlocks } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import { getBlock } from "../../helpers/getBlock";
import { Chain } from "@defillama/sdk/build/general";

const BORROW_CONTRACT_ADDRESS = [
  "0x2f6E14273514bc53deC831028CB91cB1D7b78237", // USDC
  "0x2D18cE2adC5B7c4d8558b62D49A0137A6B87049b", // USDT
  "0x7519eC4d295Ca490EaC618a80B3cc42c258F6000", // WETH
  "0xEC52881A8AEbFEB5576c08FBD1e4203f51B36524", // TIA
  "0x95CeF13441Be50d20cA4558CC0a27B601aC544E5", // MANTA
];

const PYTH_CONFIG = {
  USDC: {
    contractAddress: "0x5B27B4ACA9573F26dd12e30Cb188AC53b177006e",
    address: '0xb73603C5d87fA094B7314C74ACE2e64D165016fb',
  },
  USDT: {
    contractAddress: "0x2D18cE2adC5B7c4d8558b62D49A0137A6B87049b",
    address: '0xf417F5A458eC102B90352F697D6e2Ac3A3d2851f',
  },
  WETH: {
    contractAddress: "0x17Efd0DbAAdc554bAFDe3cC0E122f0EEB94c8661",
    address: '0x0Dc808adcE2099A9F62AA87D9670745AbA741746',
  },
  TIA: {
    contractAddress: "0xaa41F9e1f5B6d27C22f557296A0CDc3d618b0113",
    address: '0x6Fae4D9935E2fcb11fC79a64e917fb2BF14DaFaa',
  },
  MANTA: {
    contractAddress: "0x3683Ee89f1928B69962D20c08315bb7059C21dD9",
    address: '0x95CeF13441Be50d20cA4558CC0a27B601aC544E5',
  },
};
type PYTH_CONFIG_TYPE = typeof PYTH_CONFIG;
type PYTH_CONFIG_KEYS = keyof PYTH_CONFIG_TYPE;

const fetchGaiRevenue = async (timestamp: number, balances: sdk.Balances) => {
  const fromTimestamp = timestamp - 60 * 60 * 24;
  const toTimestamp = timestamp;

  const fromBlock = await getBlock(fromTimestamp, CHAIN.MANTA as Chain, {});
  const toBlock = await getBlock(toTimestamp, CHAIN.MANTA as Chain, {});

  const logs = await sdk.getEventLogs({
    targets: BORROW_CONTRACT_ADDRESS,
    toBlock: toBlock,
    fromBlock: fromBlock,
    chain: CHAIN.MANTA as Chain,
    eventAbi: "event GAIBorrowingFeePaid(address indexed _borrower, uint256 _GAIFee)",
    onlyArgs: true,
  });

  logs.forEach(log => balances.add('0xcd91716ef98798A85E79048B78287B13ae6b99b2', log._GAIFee))
};

const fetchCollateralRedemptionRevenue = async (timestamp: number, balances: sdk.Balances) => {
  const fromTimestamp = timestamp - 60 * 60 * 24;
  const toTimestamp = timestamp;

  const fromBlock = await getBlock(fromTimestamp, CHAIN.MANTA as Chain, {});
  const toBlock = await getBlock(toTimestamp, CHAIN.MANTA as Chain, {});

  for (const token of Object.keys(PYTH_CONFIG) as PYTH_CONFIG_KEYS[]) {
    const { contractAddress, address, } = PYTH_CONFIG[token];
    const logs = await sdk.getEventLogs({
      target: contractAddress,
      toBlock: toBlock,
      fromBlock: fromBlock,
      chain: CHAIN.MANTA as Chain,
      onlyArgs: true,
      eventAbi: "event Redemption(uint256 _attemptedGAIAmount, uint256 _actualGAIAmount, uint256 _COLSent, uint256 _COLFee)",
    });

    for (const log of logs)
      balances.add(address, log._COLFee)
  }
};

const adapter: Adapter = {
  adapter: {
    [CHAIN.MANTA]: {
      fetch: async (timestamp: number, _: ChainBlocks) => {
        const balances = new sdk.Balances({ chain: CHAIN.MANTA as Chain, timestamp });
        await fetchGaiRevenue(timestamp, balances);
        await fetchCollateralRedemptionRevenue(timestamp, balances);

        const totalRevenue = await balances.getUSDString()
        return {
          timestamp,
          dailyFees: totalRevenue,
          dailyRevenue: totalRevenue,
          dailyHoldersRevenue: totalRevenue,
        };
      },
      start: 1698768000, // 01 Nov 2023
    },
  },
};

export default adapter;
