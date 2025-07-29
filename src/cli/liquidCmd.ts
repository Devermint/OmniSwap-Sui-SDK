/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { readConfig } from './readConfig';
import { Command } from 'commander';
// import { getCreatedObjects, getTransactionEffects } from '@mysten/sui.js';
import { CreateAddLiquidTXPayloadParams,CreateRemoveLiquidTXPayloadParams } from '../modules';
import { addHexPrefix } from '../utils/hex';
import { randomInt } from 'crypto';

const MINT_TOKEN_MAPS:Map<string,string> = new Map([
    ['0x985c26f5edba256380648d4ad84b202094a4ade3::usdt::USDT','0xe8d7d9615ebab5a4a76dafaae6272ae0301b2939'],
    ['0x985c26f5edba256380648d4ad84b202094a4ade3::xbtc::XBTC','0x0712d20475a629e5ef9a13a7c97d36bc406155b6'],
    ['0xed67ff7ca06c2af6353fcecc69e312a0588dbab1::btc::BTC','0x6c067ce5d8ff85f34a39157c6600d7f2daf8e91c'],
    ['0xed67ff7ca06c2af6353fcecc69e312a0588dbab1::eth::ETH','0x15d7b751ce55b49bee7970708aa5ff5c9bc74fb1'],
    ['0xed67ff7ca06c2af6353fcecc69e312a0588dbab1::bnb::BNB','0x42dc81a4fc8528241ad545d53f0e945e34be5a9d'],
]);

export const listPoolCmd = async (
    program:Command
) => {
    const listPools = async() => {
        const { suiAmmSdk } = readConfig(program);
        const poolList = await suiAmmSdk.Pool.getPoolList();
        console.log(poolList);
    }
    program.command('omniswap:list_pools')
        .description('list all pools')
        .action(listPools)
}

export const addLiquidCmd = async (
    program: Command
) => {
    const addLiquid = async (
        coin_x_type:string,
        coin_y_type:string,
        coin_x_object_ids:string,
        coin_x_amount: string,
        coin_y_object_ids:string,
        coin_y_amount: string,
        slippage:string,
        gasPayment:string,
    ) => {
        const { suiAmmSdk, client, keypair } = readConfig(program);
        const coin_x_object_ids_list = coin_x_object_ids.split(',')
        const coin_y_object_ids_list = coin_y_object_ids.split(',')
        const addLiquidParams:CreateAddLiquidTXPayloadParams = {
            coin_x: coin_x_type,
            coin_y: coin_y_type,
            coin_x_objectIds:coin_x_object_ids_list,
            coin_y_objectIds: coin_y_object_ids_list,
            coin_x_amount: Number(coin_x_amount),
            coin_y_amount: Number(coin_y_amount),
            slippage: Number(slippage),
            gasPaymentObjectId:gasPayment
        }
        console.log(`Add Liquid params: ${JSON.stringify(addLiquidParams)}`);

// Build a TransactionBlock instead of legacy payload
        const addLiquidTxn = await suiAmmSdk.Pool.buildAddLiquidTransAction(addLiquidParams);

// Execute it with new API
        const executeResponse = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: addLiquidTxn,
            options: {
                showEffects: true,
                showObjectChanges: true,
                showEvents: true,
            },
        });

// Inspect the response
        console.log(
            `execute status: ${executeResponse.effects?.status.status} digest: ${executeResponse.digest}`
        );


    };
    program.command('omniswap:addLiquid')
        .description('add liquid')
        .argument('<coin_x_type>')
        .argument('<coin_y_type>')
        .argument('<coin_x_object_ids>')
        .argument('<coin_x_amount>')
        .argument('<coin_y_object_ids>')
        .argument('<coin_y_amount>')
        .argument('<slippage>')
        .argument('gaspayment')
        .action(addLiquid)
}

export const removeLiquidCmd = async (
    program: Command

) => {
    const removeLiquid = async (
        coin_x_type:string,
        coin_y_type:string,
        lp_coin_object_ids:string,

        gasPayment:string,
    ) => {
        const { suiAmmSdk, client, keypair } = readConfig(program);
        const lp_coin_object_ids_list = lp_coin_object_ids.split(",");

        const removeLiquidParams:CreateRemoveLiquidTXPayloadParams = {
            coin_x: coin_x_type,
            coin_y: coin_y_type,
            lp_coin_objectIds: lp_coin_object_ids_list,
            gasPaymentObjectId:gasPayment
        }
        console.log(`remove Liquid params: ${JSON.stringify(removeLiquidParams)}`);
        const removeLiquidTxn = await suiAmmSdk.Pool.buildRemoveLiquidTransAction(removeLiquidParams);

        const executeResponse = await client.signAndExecuteTransaction({
            transaction: removeLiquidTxn,
            signer: keypair,
            options: { showEffects: true, showObjectChanges: true },
        });

        console.log(
            `execute status: ${executeResponse.effects?.status.status} digest: ${executeResponse.digest}`
        );

    };
    program.command('omniswap:removeLiquid')
        .description('add liquid')
        .argument('<coin_x_type>')
        .argument('<coin_y_type>')
        .argument('<lp_coin_object_ids>')
        .argument('gaspayment')
        .action(removeLiquid)
}

export const adminMintTestTokenCmd= async(
    program: Command
) => {
    const DEFAULT_MINT_AMOUNT = 10000000000000;
    const DEFAULT_GAS_BUDGET = 10000;
    const adminAddLiquidCmd = async (
    ) => {
        for(const token of MINT_TOKEN_MAPS) {
            const coinTypeArg = token[0];
            const coinCapLock = token[1];
            const { suiAmmSdk, client, keypair } = readConfig(program);
            const address = keypair.getPublicKey().toSuiAddress();
            const mintTxn = await suiAmmSdk.Coin.buildAdminMintTestTokensTransaction({
                coinTypeArg: coinTypeArg,
                coinCapLock: coinCapLock,
                walletAddress: address,
                amount: DEFAULT_MINT_AMOUNT,
                gasBudget: DEFAULT_GAS_BUDGET + randomInt(1000)
            });
            const executeResponse = await client.signAndExecuteTransaction({
                transaction: mintTxn,
                signer:keypair,
                options: { showEffects: true, showObjectChanges: true },
            });



            console.log(`mint token: ${coinTypeArg}`);
            console.log(
                `execute status: ${executeResponse.effects?.status.status} digest: ${executeResponse.digest}`
            );

        }
        // 3. get sui payment object
    }
    program.command('omniswap:adminMintTestToken')
        .description('admin mint test token')
        .action(adminAddLiquidCmd);
}

export const adminAddAllLiquidCmd = async (
    program: Command
) => {
    const excuteAddliquid = async (coin_x_type:string,coin_y_type:string,coin_x_object_ids_list:string[],coin_y_object_ids_list:string[])=> {
        const { suiAmmSdk, client, keypair } = readConfig(program);

        const addLiquidParams:CreateAddLiquidTXPayloadParams = {
            coin_x: coin_x_type!,
            coin_y: coin_y_type!,
            coin_x_objectIds:coin_x_object_ids_list,
            coin_y_objectIds: coin_y_object_ids_list,
            coin_x_amount: 10000000000000,
            coin_y_amount: 10000000000000,
            slippage: 0.2
        }
        console.log(`Add Liquid params: ${JSON.stringify(addLiquidParams)}`);
        const addLiquidTxn = await suiAmmSdk.Pool.buildAddLiquidTransAction(addLiquidParams);

        const executeResponse = await client.signAndExecuteTransaction({
            transaction: addLiquidTxn,
            signer: keypair,
            options: { showEffects: true, showObjectChanges: true },
        });

        console.log(
            `execute status: ${executeResponse.effects?.status.status} digest: ${executeResponse.digest}`
        );
    }
    const addAllLiquid = async (
    ) => {
        const { suiAmmSdk, client, keypair } = readConfig(program);
        // GET USDT tokenList
        // 1. BNB TOKEN
        const tokenTypeArgList = Array.from(MINT_TOKEN_MAPS.keys());
        const bnbTokenArg = tokenTypeArgList.find(token=> token.includes('BNB'));
        const address = keypair.getPublicKey().toSuiAddress();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const bnbObject = suiAmmSdk.Coin.getCoinBalance(address,bnbTokenArg!);
        console.log(`token: ${bnbTokenArg} balance: ${(await bnbObject).balance}`)

        const ethTokenArg = tokenTypeArgList.find(token=> token.includes('ETH'));
        const ethObject = suiAmmSdk.Coin.getCoinBalance(address,ethTokenArg!);
        console.log(`token: ${ethTokenArg} balance: ${(await ethObject).balance}`)

        const btcTokenArg = tokenTypeArgList.find(token=> token.includes('btc::BTC'));
        const btcObject = suiAmmSdk.Coin.getCoinBalance(address,btcTokenArg!);
        console.log(`token: ${btcTokenArg} balance: ${(await btcObject).balance}`)

        // 2. USDT TOKEN
        const usdtTokenArg = tokenTypeArgList.find(token=> token.includes('USDT'));
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const usdtObject = suiAmmSdk.Coin.getCoinBalance(address,usdtTokenArg!);
        console.log(`token: ${usdtTokenArg} balance: ${(await usdtObject).balance}`)

        const bnbList = [(await bnbObject).objects[0].id];
        const ethList =  [(await ethObject).objects[0].id];
        const btcList =  [(await btcObject).objects[0].id];

        // 3. add BNB-USDT liquid
        await excuteAddliquid(bnbTokenArg!,usdtTokenArg!,bnbList,[(await usdtObject).objects[0].id]);
        await excuteAddliquid(ethTokenArg!,usdtTokenArg!,ethList,[(await usdtObject).objects[1].id]);
        await excuteAddliquid(btcTokenArg!,usdtTokenArg!,btcList,[(await usdtObject).objects[2].id]);

    };
    program.command('omniswap:adminAddAllLiquid')
        .description('admin add liquid')
        .action(addAllLiquid)
}