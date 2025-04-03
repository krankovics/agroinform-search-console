
const express = require("express");
const { google } = require("googleapis");
const session = require("express-session");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();

const app = express();
app.use(express.static("public"));
const port = process.env.PORT || 3000;

app.use(cors());
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/webmasters.readonly"]
  });
  res.redirect(url);
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  req.session.tokens = tokens;
  res.send("Sikeres hitelesítés! Most már lekérheted a kulcsszavakat a /keywords végponton.");
});

app.get("/keywords", async (req, res) => {
  if (!req.session.tokens) return res.status(401).send("Nem vagy hitelesítve.");
  oauth2Client.setCredentials(req.session.tokens);

  const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

  try {
    const response = await searchconsole.searchanalytics.query({
      siteUrl: "https://www.agroinform.hu",
      requestBody: {
        startDate: "2024-03-25",
        endDate: "2024-04-01",
        dimensions: ["query"],
        rowLimit: 20,
        startRow: 0,
        orderBy: [{ field: "position", sortOrder: "ASCENDING" }]
      }
    });
    res.json(response.data.rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).send("Hiba történt az adatok lekérése közben.");
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
