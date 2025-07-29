import { IModule } from '../interfaces/IModule'
import { SDK } from '../sdk';
import {Transaction} from "@mysten/sui/transactions";

export const SUI_COIN_TYPE = "0x2::sui::SUI";

export interface CoinInfo {
    id: string,
    balance: bigint,
    coinSymbol: string,
}

export interface CoinObjects {
    balance: bigint,
    objects: CoinInfo[]
}

export type CreateAdminMintPayloadParams = {
    coinTypeArg: string;
    coinCapLock:string,
    walletAddress:string,
    amount: number,
    gasBudget?: number,
}

export class CoinModule implements IModule {
    protected _sdk: SDK;

    get sdk() {
      return this._sdk;
    }

    constructor(sdk: SDK) {
      this._sdk = sdk;
    }

    // coinTypeArg: "0x2::sui::SUI"
    async getCoinBalance(address: string, coinTypeArg: string) {
        const coins = await this._sdk.client.getCoins({
            owner: address,
            coinType: coinTypeArg,
        });

        const balanceObjects: CoinInfo[] = coins.data.map((coin) => ({
            id: coin.coinObjectId,
            balance: BigInt(coin.balance),
            coinSymbol: coinTypeArg.split("::").pop() ?? "UNKNOWN",
        }));

        const balanceSum = balanceObjects.reduce((pre, cur) => {
            return Number(cur.balance) + pre;
        }, 0);

        return {
            balance: balanceSum,
            objects: balanceObjects,
        };
    }


    async buildFaucetTokenTransaction(coinTypeArg: string) {
        const faucetPackageId = this.sdk.networkOptions.faucetPackageId;
        const faucetObjectId = this.sdk.networkOptions.faucetObjectId;

        const tx = new Transaction();
        tx.setGasBudget(10_000);

        tx.moveCall({
            target: `${faucetPackageId}::faucet::claim`,
            arguments: [tx.object(faucetObjectId)],
            typeArguments: [coinTypeArg],
        });

        return tx;
    }


    // only admin
    async buildAdminMintTestTokensTransaction(
        createAdminMintPayloadParams: CreateAdminMintPayloadParams
    ) {
        const faucetPackageId = this.sdk.networkOptions.faucetPackageId;

        const tx = new Transaction();
        tx.setGasBudget(createAdminMintPayloadParams.gasBudget ?? 10_000);

        tx.moveCall({
            target: `${faucetPackageId}::lock::mint_and_transfer`,
            arguments: [
                tx.object(createAdminMintPayloadParams.coinCapLock),   // object ID
                tx.pure.u64(createAdminMintPayloadParams.amount),      // pure number
                tx.pure.address(createAdminMintPayloadParams.walletAddress), // wallet address
            ],
            typeArguments: [createAdminMintPayloadParams.coinTypeArg],
        });

        return tx;
    }

    // async buildSpiltTransaction(signerAddress: string, splitTxn:SplitCoinTransaction) {
    //     const serializer = await this._sdk.serializer.serializeToByte(
    //         signerAddress,
    //         splitTxn
    //     );
    //     return serializer.getData();
    // }

    // async buildMergeTransaction(signerAddress: string, mergeTxn:MergeCoinTransaction) {
    //     const serializer = await this._sdk.serializer.newMergeCoin(
    //         signerAddress,
    //         mergeTxn
    //     );
    //     return serializer.getData();
    // }
 }
