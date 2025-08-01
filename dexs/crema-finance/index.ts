import fetchURL from "../../utils/fetchURL"
import { SimpleAdapter } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import { getUniqStartOfTodayTimestamp } from "../../helpers/getUniSubgraphVolume";

const historicalVolumeEndpoint = "https://api.crema.finance/v1/histogram?date_type=day&typ=vol&limit=1000"

interface IVolumeall {
  num: string;
  date: string;
}

const fetch = async (timestamp: number) => {
  const dayTimestamp = getUniqStartOfTodayTimestamp(new Date(timestamp * 1000))
  const historicalVolume: IVolumeall[] = (await fetchURL(historicalVolumeEndpoint))?.data.list;
  const totalVolume = historicalVolume
    .filter(volItem => (new Date(volItem.date.split('T')[0]).getTime() / 1000) <= dayTimestamp)
    .reduce((acc, { num }) => acc + Number(num), 0)

  const dailyVolume = historicalVolume
    .find(dayItem => (new Date(dayItem.date.split('T')[0]).getTime() / 1000) === dayTimestamp)?.num

  return {
    totalVolume: totalVolume,
    dailyVolume: dailyVolume,
    timestamp: dayTimestamp,
  };
};

const getStartTimestamp = async () => {
  const historicalVolume: IVolumeall[] = (await fetchURL(historicalVolumeEndpoint))?.data.list;
  return (new Date(historicalVolume[0].date.split('T')[0]).getTime()) / 1000
}

const adapter: SimpleAdapter = {
  adapter: {
    [CHAIN.SOLANA]: {
      fetch,
      start: getStartTimestamp,
    },
  },
};

export default adapter;
