import { NetworkConfiguration } from '../config/configuration';
import { SwapModule,CoinModule,PoolModule, CoinListModule } from '../modules';
import {SuiClient} from "@mysten/sui/client";

export class SDK {
    protected _client: SuiClient;
    protected _networkConfiguration: NetworkConfiguration;
    protected _swap:SwapModule;
    protected _pool:PoolModule;
    protected _token:CoinModule;
    protected _coinList: CoinListModule;

    get client() {
        return this._client;
    }

    get Swap() {
        return this._swap;
    }

    get Pool() {
        return this._pool;
    }

    get Coin() {
        return this._token;
    }

    get CoinList() {
        return this._coinList;
    }

    get networkOptions() {
        return this._networkConfiguration;
    }

    constructor(networkConfiguration:NetworkConfiguration) {
        this._client = new SuiClient({
            url: networkConfiguration.fullNodeUrl,
        });
        this._networkConfiguration = networkConfiguration;
        this._swap = new SwapModule(this);
        this._token = new CoinModule(this);
        this._pool = new PoolModule(this);
        this._coinList = new CoinListModule(this);
    }
}