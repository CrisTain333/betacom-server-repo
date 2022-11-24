const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@practicebaba.aon4ndq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

app.get("/", (req, res) => {
  res.send("Betacom Server On Fire");
});






app.listen(PORT, () => {
    console.log(`Betacom server Running On Port ${PORT} `);
    client.connect((err) => {
      if (err) {
        return console.log(err);
      }
      console.log("Connected To Database");
    });
  });
  
  