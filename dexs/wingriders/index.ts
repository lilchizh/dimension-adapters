import BigNumber from "bignumber.js";
import { Adapter } from "../../adapters/types"
import { CHAIN } from "../../helpers/chains";
import { getPrices } from "../../utils/prices";
import { httpPost } from "../../utils/fetchURL";

const volUrl = 'https://aggregator.mainnet.wingriders.com/volumeInAda';

async function fetchVolume(timestamp: number) {
    const last24hVolInAda = await httpPost(volUrl, { "lastNHours": 24 });
    const totalVolumeInAda = await httpPost(volUrl, {});
    const coinId = "coingecko:cardano";
    const prices = await getPrices([coinId], timestamp)

    const adaPrice = prices[coinId].price;

    const dailyVolume = (new BigNumber(last24hVolInAda).multipliedBy(adaPrice)).toString();
    const totalVolume = (new BigNumber(totalVolumeInAda).multipliedBy(adaPrice)).toString();

    return {
        dailyVolume,
        totalVolume,
        timestamp: Date.now() / 1e3
    }
}

export default {
    adapter: {
        [CHAIN.CARDANO]: {
            fetch: fetchVolume,
            runAtCurrTime: true,
            start: 0,
        }
    }
} as Adapter
