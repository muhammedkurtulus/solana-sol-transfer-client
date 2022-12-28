import * as Web3 from "@solana/web3.js";
import dotenv from "dotenv";
import * as fs from "fs";
dotenv.config();

async function main() {
  const connection = new Web3.Connection(Web3.clusterApiUrl("devnet"));
  const sender = await initializeKeypair(connection);
  const receiver = Web3.Keypair.generate().publicKey;
  console.log("Sender public key:", sender.publicKey.toBase58());
  console.log("Receiver public key:", receiver.toBase58());
  await sendSol(
    connection,
    0.1 * Web3.LAMPORTS_PER_SOL,
    receiver,
    sender
  );
}

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

async function initializeKeypair(
  connection: Web3.Connection
): Promise<Web3.Keypair> {
  if (!process.env.PRIVATE_KEY) {
    console.log("Generating new keypair... 🗝️");
    const signer = Web3.Keypair.generate();

    console.log("Creating .env file");
    fs.writeFileSync(".env", `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

    await airdropSolIfNeeded(signer, connection);

    return signer;
  }

  const secret = JSON.parse(process.env.PRIVATE_KEY ?? "") as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecret = Web3.Keypair.fromSecretKey(secretKey);
  await airdropSolIfNeeded(keypairFromSecret, connection);
  return keypairFromSecret;
}

async function airdropSolIfNeeded(
  signer: Web3.Keypair,
  connection: Web3.Connection
) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log("Current balance is", balance / Web3.LAMPORTS_PER_SOL, "SOL");

  if (balance / Web3.LAMPORTS_PER_SOL < 0.1) {
    
    console.log("Airdropping 1 SOL");
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      Web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log("New balance is", newBalance / Web3.LAMPORTS_PER_SOL, "SOL");
  }
}

async function sendSol(
  connection: Web3.Connection,
  amount: number,
  to: Web3.PublicKey,
  sender: Web3.Keypair
) {
  const transaction = new Web3.Transaction();

  const sendSolInstruction = Web3.SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: to,
    lamports: amount,
  });

  transaction.add(sendSolInstruction);

  const tx = await Web3.sendAndConfirmTransaction(connection, transaction, [
    sender,
  ]);
  console.log(
    `You can view your transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${tx}?cluster=devnet`
  );
}
