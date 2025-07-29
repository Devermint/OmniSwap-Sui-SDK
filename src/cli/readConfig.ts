import { Command } from 'commander';
import * as fs from 'fs';
import { SDK } from '../sdk';
import { CONFIGS } from '../config';
import {Ed25519Keypair} from "@mysten/sui/dist/cjs/keypairs/ed25519";
import {SuiClient} from "@mysten/sui/client";
import { fromBase64 } from "@mysten/sui/utils";

export const readConfig = (program: Command) => {
    const { config } = program.opts();
    const keystoreList = fs.readFileSync(config + "/sui.keystore", { encoding: "utf-8" });
    const parsed = JSON.parse(keystoreList);

    // decode the first entry from base64 → Uint8Array
    const decoded = fromBase64(parsed[0]);

    // strip the first byte (scheme flag), leaving the 64‑byte secret
    const secretKey = decoded.slice(1);

    // Ed25519Keypair expects the full 64‑byte secret
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);

    const suiAmmSdk = new SDK(CONFIGS.testnet);
    const client = new SuiClient({ url: suiAmmSdk.networkOptions.fullNodeUrl });

    return { suiAmmSdk, client, keypair };
};