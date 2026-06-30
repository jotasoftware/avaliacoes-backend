const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const credentials = JSON.parse(
  fs.readFileSync("credentials.json")
);

const { client_id, client_secret, redirect_uris } =
  credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: [
    "https://www.googleapis.com/auth/drive.file"
  ]
});

console.log("\nAbra esta URL:\n");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nCole o código aqui: ", async (code) => {
  const { tokens } =
    await oAuth2Client.getToken(code);

  fs.writeFileSync(
    "token.json",
    JSON.stringify(tokens, null, 2)
  );

  console.log("\nToken gerado com sucesso!");

  rl.close();
});