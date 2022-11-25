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

const run = () => {
  const productsCollection = client.db("betacom").collection("products");
  const categoryCollection = client.db("betacom").collection("category");
  const usersCollection = client.db("betacom").collection("users");

  try {
    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { categoryId: id };
      const result = await productsCollection.find(filter).toArray();
      res.send(result);
    });

    app.post('/users',async(req,res)=>{
      const user = req.body;
      console.log(user);
      const result =  await usersCollection.insertOne(user);
      res.send(result);
    })

  } finally {
  }
};

run();

app.listen(PORT, () => {
  console.log(`Betacom server Running On Port ${PORT} `);
  client.connect((err) => {
    if (err) {
      return console.log(err);
    }
    console.log("Connected To Database");
  });
});
