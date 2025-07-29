/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { IModule } from '../interfaces/IModule'
import { SDK } from '../sdk';
import {d} from "../utils/number";
import Decimal from "decimal.js";
import {MoveCallTransaction} from "@mysten/sui/dist/cjs/graphql/generated/queries";
import {Transaction} from "@mysten/sui/transactions";

export type CalculateRatesParams = {
  fromToken: string;
  toToken: string;
  amount: bigint;
  interactiveToken: 'from' | 'to',
  pool: {
    lpToken: string,
    moduleAddress: string,
    address: string
  },
}

export type CreateSwapTXPayloadParams = {
  coin_x: string;
  coin_y: string;
  coins_in_objectIds: string[];
  coins_in_value: number;
  coins_out_min: number;
  gasPaymentObjectId: string;
}

export class SwapModule implements IModule {
    protected _sdk: SDK;

    get sdk() {
      return this._sdk;
    }

    constructor(sdk: SDK) {
      this._sdk = sdk;
    }

    getCoinOutWithFees(
      coinInVal: Decimal.Instance,
      reserveInSize: Decimal.Instance,
      reserveOutSize: Decimal.Instance
    ) {
      const { feePct, feeScale } = { feePct: d(3), feeScale: d(1000) };
      const feeMultiplier = feeScale.sub(feePct);
      const coinInAfterFees = coinInVal.mul(feeMultiplier);
      const newReservesInSize = reserveInSize.mul(feeScale).plus(coinInAfterFees);

      return coinInAfterFees.mul(reserveOutSize).div(newReservesInSize).toDP(0);
    }

    getCoinInWithFee(
      coinOutVal: Decimal.Instance,
      reserveOutSize: Decimal.Instance,
      reserveInSize: Decimal.Instance
      ) {
        const { feePct, feeScale } = { feePct: d(3), feeScale: d(1000) };
        const feeMultiplier = feeScale.sub(feePct);
        const newReservesOutSize = (reserveOutSize.minus(coinOutVal)).mul(feeMultiplier);

        return coinOutVal.mul(feeScale).mul(reserveInSize).div(newReservesOutSize).toDP(0).abs();

    }
    getSpotPrice(
        reserveIn: Decimal.Instance,
        reserveOut: Decimal.Instance
    ) {
        return reserveIn.div(reserveOut);
    }
    getExecutionPrice(
        amountIn: Decimal.Instance,
        amountOut: Decimal.Instance
    ) {
        if (amountOut.eq(0)) return d(0);
        return amountIn.div(amountOut);
    }
    getSlippage(
        amountIn: Decimal.Instance,
        reserveIn: Decimal.Instance,
        reserveOut: Decimal.Instance
    ) {
        const spotPrice = this.getSpotPrice(reserveIn, reserveOut);
        const amountOut = this.getCoinOutWithFees(amountIn, reserveIn, reserveOut);
        const execPrice = this.getExecutionPrice(amountIn, amountOut);

        // Positive = worse than spot, Negative = better (rare in AMMs)
        return execPrice.minus(spotPrice).div(spotPrice);
    }
    async calculateRate(interactiveToken: string, coin_x: string, coin_y: string, coin_in_value: number) {
        const pool = await this.sdk.Pool.getPoolInfo(coin_x, coin_y);
        const coin_x_reserve = d(pool.coin_x);
        const coin_y_reserve = d(pool.coin_y);

        const [reserveIn, reserveOut] =
            interactiveToken === 'from'
                ? [coin_x_reserve, coin_y_reserve]
                : [coin_y_reserve, coin_x_reserve];

        const amountIn = d(coin_in_value);
        const amountOut =
            interactiveToken === 'from'
                ? this.getCoinOutWithFees(amountIn, reserveIn, reserveOut)
                : this.getCoinInWithFee(amountIn, reserveIn, reserveOut);

        const spotPrice = this.getSpotPrice(reserveIn, reserveOut);
        const execPrice = this.getExecutionPrice(amountIn, amountOut);
        const slippage = execPrice.minus(spotPrice).div(spotPrice);

        return {
            amountOut: amountOut.toString(),
            spotPrice: spotPrice.toString(),
            execPrice: execPrice.toString(),
            slippage: slippage.toString(),
        };
    }


    buildSwapTransaction(params: CreateSwapTXPayloadParams) {
        const { packageObjectId, globalId } = this.sdk.networkOptions;

        const tx = new Transaction();
        tx.setGasBudget(10_000);

        tx.moveCall({
            target: `${packageObjectId}::interface::multi_swap`,
            arguments: [
                tx.object(globalId),
                tx.makeMoveVec({ elements: params.coins_in_objectIds.map(id => tx.object(id)) }),
                tx.pure.u64(params.coins_in_value),
                tx.pure.u64(params.coins_out_min),
            ],
            typeArguments: [params.coin_x, params.coin_y],
        });

        return tx;
    }

 }

 export function withSlippage(value: Decimal.Instance, slippage: Decimal.Instance, mode: 'plus' | 'minus') {
  return d(value)[mode](d(value).mul(slippage)).toDP(0);
}