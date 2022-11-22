export declare type Pool = {
    pool_addr: string;
    pool_type: string;
    coin_x_type?: string;
    coin_y_type?: string;
};
export declare type PoolInfo = {
    object_id: string;
    global: string;
    coin_x: number;
    coin_y: number;
    fee_coin_y: number;
    fee_coin_x: number;
    lp_type: string;
    lp_supply: bigint;
};
export declare type TxPayloadCallFunction = {
    packageObjectId: string;
    module: string;
    function: string;
    typeArguments: string[];
    arguments: string[];
    gasBudget: number;
};
//# sourceMappingURL=index.d.ts.map