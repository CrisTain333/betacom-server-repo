const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
app.use(cors());
app.use(express.json());
require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  organization: "org-3cOcBNDZaYZSIUeat6F4rgc7",
  apiKey: process.env.OPEN_AI_API_KEY,
});
const openAi = new OpenAIApi(configuration);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@practicebaba.aon4ndq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ message: "You don't Have Permission to access" });
    }

    req.decoded = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("Betacom Server On Fire");
});

const run = () => {
  const productsCollection = client.db("betacom").collection("products");
  const categoryCollection = client.db("betacom").collection("category");
  const usersCollection = client.db("betacom").collection("users");
  const bookingsCollection = client.db("betacom").collection("booking");
  const paymentsCollection = client.db("betacom").collection("payment");
  const reportedCollection = client.db("betacom").collection("reported");

  const verifySeller = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await usersCollection.findOne(query);

    if (user?.accountType !== "sellerAccount") {
      return res.status(403).send({ message: "forbidden access" });
    }
    next();
  };
  const verifyAdmin = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const user = await usersCollection.findOne(query);

    if (user?.role !== "admin") {
      return res.status(403).send({ message: "forbidden access" });
    }
    next();
  };

  try {
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "2 days",
      });
      res.json(token);
    });

    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { categoryId: id };
      const result = await productsCollection.find(filter).toArray();
      const unPaidProduct = result.filter((p) => p.paid !== true);
      res.send(unPaidProduct);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = {};
      const users = await usersCollection.find(query).toArray();
      console.log(users);
      const checking = users.forEach((e) => e.email !== user.email);
      console.log(checking);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    app.post("/ai/ask", async (req, res) => {
      const { message } = req?.body;
      const response = await openAi.createCompletion({
        model: "text-davinci-003",
        prompt: `${message}`,
        max_tokens: 100,
        temperature: 0.5,
      });
      res.json({ data: response?.data?.choices[0].text });
      return {
        data: response?.data?.choices[0].text,
        status: 201,
        message: "Success",
      };
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.get("/users/sellerAccount/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSellerAccount: user?.accountType === "sellerAccount" });
    });
    app.get("/users/normalUser/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isNormalUser: user?.accountType === "normalUser" });
    });

    app.get("/users/isVerified/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isVerified: user?.isVerifyed === true });
    });

    app.get("/users/sellers", async (req, res) => {
      const query = { accountType: "sellerAccount" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/users/buyers", async (req, res) => {
      const query = { accountType: "normalUser" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.put(
      "/users/verify/:email",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const user = req.params.email;
        const filter = { email: user };
        const updatedDoc = {
          $set: {
            isVerifyed: true,
          },
        };
        const update = {
          $set: {
            isVerifyed: true,
          },
        };
        const up = await productsCollection.updateMany(filter, update);
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
    app.get("/bookings", verifyJWT, async (req, res) => {
      const user = req.decoded;
      console.log(user);
      const email = req.query.email;
      if (user?.email !== email) {
        return res
          .status(403)
          .send({ message: "You are not allowed to do that!" });
      }
      const filter = { email: email };
      const bookings = await bookingsCollection.find(filter).toArray();
      res.send(bookings);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await bookingsCollection.findOne(filter);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.ResalePrice;
      const amount = price * 100;
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const fil = { productName: payment.productName };
      const updatedDocument = {
        $set: {
          paid: true,
        },
      };
      const up = await productsCollection.updateOne(fil, updatedDocument);
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(result);
    });

    app.post("/product", verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);

      res.send(result);
    });

    app.get("/products", verifyJWT, async (req, res) => {
      const user = req.decoded;
      console.log(user);
      const email = req.query.email;

      if (user?.email !== email) {
        return res
          .status(403)
          .send({ message: "You are not allowed to do that!" });
      }
      const query = { email: email };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.put("/products/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          advertise: true,
        },
      };
      const updatedResult = await productsCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedResult);
    });
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/product/advertisedProduct", async (req, res) => {
      const query = { advertise: true };
      const result = await productsCollection.find(query).toArray();
      console.log(result);
      const mainProducts = result.filter((p) => p.paid !== true);
      res.send(mainProducts);
    });

    app.get("/reports", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const result = await reportedCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/report/:id", async (req, res) => {
      const reportedProduct = req.body;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          reported: true,
        },
      };
      const up = await productsCollection.updateOne(filter, updatedDoc);
      const result = await reportedCollection.insertOne(reportedProduct);
      res.send(result);
    });

    app.delete("/report/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const productId = req.params.id;
      const filter = { productId: productId };
      const ftr = { _id: ObjectId(productId) };
      const deleteProduct = await productsCollection.deleteOne(ftr);
      const result = await reportedCollection.deleteOne(filter);
      res.send(result);
    });
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
