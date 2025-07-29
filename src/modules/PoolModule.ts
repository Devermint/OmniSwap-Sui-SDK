/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IModule } from '../interfaces/IModule'
import { SDK } from '../sdk';
import { Pool,PoolInfo } from '../types';
import { checkPairValid } from '../utils/contracts'
import {d} from "../utils/number";
import Decimal from "decimal.js";
import {Transaction} from "@mysten/sui/transactions";

export type CreateAddLiquidTXPayloadParams = {
  coin_x: string;
  coin_y: string;
  coin_x_objectIds: string[],
  coin_y_objectIds: string[],
  coin_x_amount: number;
  coin_y_amount: number;
  gasPaymentObjectId?: string;
  slippage: number;
}

export type CreateRemoveLiquidTXPayloadParams = {
  coin_x: string;
  coin_y: string;
  lp_coin_objectIds: string[],
  gasPaymentObjectId: string;
}

export class PoolModule implements IModule {

   protected _sdk: SDK;

   get sdk() {
     return this._sdk;
   }

   constructor(sdk: SDK) {
     this._sdk = sdk;
   }

   // eslint-disable-next-line @typescript-eslint/no-empty-function
   async getPoolList():Promise<Pool[]>{
      const { poolsDynamicId } = this.sdk.networkOptions;
      console.log({poolsDynamicId});
      const poolsObjects = await this._sdk.client.getDynamicFields({parentId:poolsDynamicId});
      console.log({poolsObjects});
      const pools:Pool[] = [];
      poolsObjects?.data?.forEach(pool=> {
        pools.push({
          pool_addr: pool['objectId'],
          pool_type: pool['objectType'],
        })
      })
      return Promise.resolve(pools)
   }

   async getPoolInfo(coinXType:string, coinYType: string): Promise<PoolInfo> {
        const poolList:Pool[] = await this.getPoolList();
        console.log({coinXType, coinYType});
        if (!checkPairValid(coinXType,coinYType)) {
          Promise.reject('Invalid Pair');
        }
        // if (!this.sdk.CoinList.getCoinInfoByType(coinXType) || !this.sdk.CoinList.getCoinInfoByType(coinYType)) {
        //   Promise.reject('Coin Not In Offical Coin List')
        // }

        const pool:Pool | undefined = poolList.find(pool => {
            return pool.pool_type.includes(coinXType) && pool.pool_type.includes(coinYType);
        })
       console.log(pool);
        const moveObject = await this._sdk.client.getObject({id:pool!.pool_addr, options:{
                showBcs:true,
                showContent:true,
                showDisplay:true,
                showOwner:true,
                showPreviousTransaction:true,
                showStorageRebate:true,
                showType:true,
            }});

       const id = moveObject.data?.objectId ?? "";

       const content = moveObject.data?.content;
       if (!content || content.dataType !== "moveObject") {
           return Promise.reject('Invalid Move object content');
       }

       const fields = (content.fields as any).value.fields;

       const lpSupply = fields['lp_supply'];

       const poolInfo: PoolInfo = {
           object_id: id,
           global: fields['global'],
           coin_x: Number(fields['coin_x']),
           coin_y: Number(fields['coin_y']),
           fee_coin_x: Number(fields['fee_coin_x']),
           fee_coin_y: Number(fields['fee_coin_y']),
           lp_type: String(lpSupply.type),
           lp_supply: lpSupply.fields['value'],
       };

       return poolInfo;
   }

   getCoinOut(
    coinInVal: Decimal.Instance,
    reserveInSize: Decimal.Instance,
    reserveOutSize: Decimal.Instance
  ) {
    return coinInVal.mul(reserveInSize).div(reserveOutSize).toDP(0);
  }

  getCoinIn(
      coinOutVal: Decimal.Instance,
      reserveOutSize: Decimal.Instance,
      reserveInSize: Decimal.Instance
  ) {
    return coinOutVal.mul(reserveOutSize).div(reserveInSize).toDP(0);
  }

  async calculateRate(interactiveToken: string,coin_x:string,coin_y:string,coin_in_value:number) {
    const fromCoinInfo = this.sdk.CoinList.getCoinInfoByType(coin_x);
    const toCoinInfo = this.sdk.CoinList.getCoinInfoByType(coin_y);
    if (!fromCoinInfo) {
      throw new Error('From Coin not exists');
    }
    if (!toCoinInfo) {
      throw new Error('To Coin not exits');
    }
    const pool = await this.sdk.Pool.getPoolInfo(coin_x, coin_y);
    const coin_x_reserve = pool.coin_x;
    const coin_y_reserce = pool.coin_y;

    const [reserveX, reserveY] =
      interactiveToken === 'from' ? [coin_x_reserve,coin_y_reserce] : [coin_y_reserce,coin_x_reserve];

    const coin_x_in = d(coin_in_value);

    const amoutOut =
       interactiveToken === 'from' ? this.getCoinOut(d(coin_x_in),d(reserveX),d(reserveY))
       : this.getCoinIn(coin_x_in,d(reserveX),d(reserveY));

    return amoutOut;
  }

    buildAddLiquidTransAction(params: CreateAddLiquidTXPayloadParams) {
        const { packageObjectId, globalId } = this.sdk.networkOptions;

        const tx = new Transaction();
        tx.setGasBudget(20_000);

        tx.moveCall({
            target: `${packageObjectId}::interface::multi_add_liquidity`,
            arguments: [
                tx.object(globalId),
                tx.makeMoveVec({ elements: params.coin_x_objectIds.map(id => tx.object(id)) }),
                tx.pure.u64(params.coin_x_amount),
                tx.pure.u64(params.coin_x_amount * params.slippage),
                tx.makeMoveVec({ elements: params.coin_y_objectIds.map(id => tx.object(id)) }),
                tx.pure.u64(params.coin_y_amount),
                tx.pure.u64(params.coin_y_amount * params.slippage),
            ],
            typeArguments: [params.coin_x, params.coin_y],
        });

        return tx;
    }

    buildRemoveLiquidTransAction(params: CreateRemoveLiquidTXPayloadParams) {
        const { packageObjectId, globalId } = this.sdk.networkOptions;

        const tx = new Transaction();
        tx.setGasBudget(10_000);

        tx.moveCall({
            target: `${packageObjectId}::interface::multi_remove_liquidity`,
            arguments: [
                tx.object(globalId),
                tx.makeMoveVec({ elements: params.lp_coin_objectIds.map(id => tx.object(id)) }),
            ],
            typeArguments: [params.coin_x, params.coin_y],
        });

        return tx;
    }

}
