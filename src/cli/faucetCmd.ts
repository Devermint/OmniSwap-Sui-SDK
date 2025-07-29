import { readConfig } from './readConfig';
import { Command } from 'commander';

export const faucetTokenCmd = async (
    program: Command
) => {
    const facuetTokens = async (
        coin_type :string
    ) => {
        const { suiAmmSdk, client, keypair } = readConfig(program);
        const faucetTokenTxn = await suiAmmSdk.Coin.buildFaucetTokenTransaction(coin_type);
        const executeResponse = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: faucetTokenTxn,
            options: { showEffects: true },
        });

        console.log(
            `execute status: ${executeResponse.effects?.status.status} digest: ${executeResponse.digest}`
        );
    };
    program.command('omniswap:faucet')
        .description('faucet token')
        .argument('<coin_type>')
        .action(facuetTokens)
}