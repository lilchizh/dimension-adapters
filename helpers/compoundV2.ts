import { Fetch, FetchOptions } from "../adapters/types";
import * as sdk from "@defillama/sdk";

const comptrollerABI = {
  underlying: "address:underlying",
  getAllMarkets: "address[]:getAllMarkets",
  accrueInterest: "event AccrueInterest(uint256 cashPrior,uint256 interestAccumulated,uint256 borrowIndex,uint256 totalBorrows)",
  reserveFactor: "uint256:reserveFactorMantissa",
};

export async function getFees(market: string, { createBalances, api, getLogs, }: FetchOptions, {
  dailyFees,
  dailyRevenue,
  abis = {},
}: {
  dailyFees?: sdk.Balances,
  dailyRevenue?: sdk.Balances,
  abis?: any
}) {
  if (!dailyFees) dailyFees = createBalances()
  if (!dailyRevenue) dailyRevenue = createBalances()
  const markets = await api.call({ target: market, abi: comptrollerABI.getAllMarkets, })
  const underlyings = await api.multiCall({ calls: markets, abi: comptrollerABI.underlying, permitFailure: true, });
  underlyings.forEach((underlying, index) => {
    if (!underlying) underlyings[index] = '0x0000000000000000000000000000000000000000'
  })
  const reserveFactors = await api.multiCall({ calls: markets, abi: abis.reserveFactor ?? comptrollerABI.reserveFactor, });
  const logs: any[] = (await getLogs({
    targets: markets,
    flatten: false,
    eventAbi: comptrollerABI.accrueInterest,
  })).map((log: any, index: number) => {
    return log.map((i: any) => ({
      ...i,
      interestAccumulated: Number(i.interestAccumulated),
      marketIndex: index,
    }));
  }).flat()

  logs.forEach((log: any) => {
    const marketIndex = log.marketIndex;
    const underlying = underlyings[marketIndex]
    dailyFees!.add(underlying, log.interestAccumulated);
    dailyRevenue!.add(underlying, log.interestAccumulated * Number(reserveFactors[marketIndex]) / 1e18);
  })

  return { dailyFees, dailyRevenue }
}

export function getFeesExport(market: string) {
  return (async (timestamp: number, _: any, options: FetchOptions) => {
    const { dailyFees, dailyRevenue } = await getFees(market, options, {})
    const dailyHoldersRevenue = dailyRevenue
    const dailySupplySideRevenue = options.createBalances()
    dailySupplySideRevenue.addBalances(dailyFees)
    Object.entries(dailyRevenue.getBalances()).forEach(([token, balance]) => {
      dailySupplySideRevenue.addTokenVannila(token, Number(balance) * -1)
    })
    return { timestamp, dailyFees, dailyRevenue, dailyHoldersRevenue, dailySupplySideRevenue }
  }) as Fetch
}