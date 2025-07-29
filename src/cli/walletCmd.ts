import { readConfig } from './readConfig';
import { Command } from 'commander';
import { addHexPrefix } from '../utils/hex';
import { SUI_COIN_TYPE } from '../constants'

export const walletCmd = async (
    program: Command
) => {
    const wallet = async (
    ) => {
        const { suiAmmSdk, client, keypair } = readConfig(program);
        const address = keypair.getPublicKey().toSuiAddress();
        const suiBalance = await suiAmmSdk.Coin.getCoinBalance(address,SUI_COIN_TYPE);
        console.log(`address: ${address} sui balance: ${  suiBalance.balance }`);
    };
    program.command('omniswap:wallet')
        .description('print wallet ')
        .action(wallet)
}