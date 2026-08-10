const fs = require("fs");
const { google } = require("googleapis");

const credentials = JSON.parse(
  fs.readFileSync("credentials.json")
);

const token = JSON.parse(
  fs.readFileSync("token.json")
);

const { client_id, client_secret, redirect_uris } =
  credentials.installed;

const auth = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

auth.setCredentials(token);

const drive = google.drive({
  version: "v3",
  auth,
});

module.exports = drive;