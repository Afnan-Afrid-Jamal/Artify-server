const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const serviceAccount = require("./firebase_serviceKey.json");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = 3000;

app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.urzvqyi.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Firebase Auth Middleware Function
const firebaseVerifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Token missing!" });
  }

  const token = authHeader.split(" ")[1];

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (err) {
    return res.status(401).send({ message: "Invalid token!" });
  }
};

async function run() {
  try {
    // await client.connect();

    const database = client.db("artifyDB");
    const artworkCollection = database.collection("artworks");
    const favouritesCollection = database.collection("favouritesArtworks");
    const blogsCollection = database.collection("blogs");
    const feedbackCollection = database.collection("AnonymousFeedback");

    // Get Data(all artworks)

    app.get("/all-artworks", firebaseVerifyToken, async (req, res) => {
      try {
        const result = await artworkCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Get Data(most liked)
    app.get("/all-artworks/trending-artwork", async (req, res) => {
      try {
        const result = await artworkCollection
          .find()
          .sort({ likesCount: -1 })
          .limit(6)
          .toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Get Data(most recent)
    app.get("/all-artworks/most-recent", async (req, res) => {
      try {
        const result = await artworkCollection
          .find({})
          .sort({ createdAt: -1 })
          .limit(8)
          .toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Premium Artworks
    app.get("/premium-collection", async (req, res) => {
      try {
        const allArtworks = await artworkCollection.find().toArray();

        const premiumArtworks = allArtworks
          .filter((art) => art.price > 0)
          .sort((a, b) => b.price - a.price)
          .slice(0, 8);

        res.send(premiumArtworks);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Could not fetch premium artworks" });
      }
    });

    // Explore artworks (public)

    app.get("/all-artworks/public", async (req, res) => {
      try {
        const result = await artworkCollection
          .find({ visibility: "Public" })
          .toArray();
        res.status(200).json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Search by title API

    app.get("/all-artworks/search", async (req, res) => {
      const searchedText = req.query.search;
      const result = await artworkCollection
        .find({ title: { $regex: searchedText, $options: "i" } })
        .toArray();
      res.send(result);
    });

    // Add Favourite
    app.post("/favourites", firebaseVerifyToken, async (req, res) => {
      try {
        const data = req.body;
        const result = await favouritesCollection.insertOne(data);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to add to favourites",
        });
      }
    });

    // Get Favourites Data
    app.get("/favourites-data", firebaseVerifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        const result = await favouritesCollection
          .find({ userEmail: email })
          .toArray();
        res.status(200).send({ success: true, data: result });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch favourites data",
        });
      }
    });

    // Unfavorite artwork

    app.delete("/unfavourite/:id", firebaseVerifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const result = await favouritesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 1) {
          res.status(200).send({
            success: true,
            message: "Artwork removed from favourites",
          });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Artwork not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to remove artwork from favourites",
        });
      }
    });

    // Add Artworks

    app.post("/all-artworks", firebaseVerifyToken, async (req, res) => {
      const artworkData = req.body;
      const result = await artworkCollection.insertOne(artworkData);
      res.send(result);
    });

    // Delete Artworks
    app.delete(
      "/delete-artworks/:id",
      firebaseVerifyToken,
      async (req, res) => {
        try {
          const { id } = req.params;
          const result = await artworkCollection.deleteOne({
            _id: new ObjectId(id),
          });

          if (result.deletedCount === 1) {
            res.status(200).send({
              success: true,
              message: "Artwork deleted successfully",
            });
          } else {
            res.status(404).send({
              success: false,
              message: "Artwork not found",
            });
          }
        } catch (error) {
          console.error(error);
          res.status(500).send({
            success: false,
            message: "Failed to delete artwork",
            error: error.message,
          });
        }
      }
    );

    // Update Artwork

    app.put("/update-artwork/:id", firebaseVerifyToken, async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const objectId = { _id: new ObjectId(id) };
      const finalData = {
        $set: data,
      };
      const result = await artworkCollection.updateOne(objectId, finalData);
      res.send(result);
    });

    // Get Data(view details)
    const { ObjectId } = require("mongodb");

    app.get("/all-artworks/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid artwork ID" });
        }

        const result = await artworkCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!result) {
          return res.status(404).json({ message: "Artwork not found" });
        } else {
          res.status(200).json(result);
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // My Gallery

    app.get("/my-gallery", firebaseVerifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        const result = await artworkCollection
          .find({ artistEmail: email })
          .toArray();
        res.status(200).send({ success: true, data: result });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch my gallery page data",
        });
      }
    });

    // Blogs

    // Get Blogs
    app.get("/blogs", async (req, res) => {
      try {
        const result = await blogsCollection.find().toArray();
        res.status(200).send({ success: true, data: result });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch Blogs page data",
        });
      }
    });
    // Get Six Blogs
    app.get("/eightBlogs", async (req, res) => {
      try {
        const result = await blogsCollection.find().limit(8).toArray();
        res.status(200).send({ success: true, data: result });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch Blogs page data",
        });
      }
    });

    // Get Single Blog Details
    app.get("/blogs/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) }; // 'objectId' kotha-ti 'ObjectId' hobe (O capital)
        const result = await blogsCollection.findOne(query);

        if (!result) {
          return res
            .status(404)
            .send({ success: false, message: "Blog not found" });
        }

        res.status(200).send({ success: true, data: result });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch Blog Details data",
        });
      }
    });
    // Like increase, decrease

    app.patch(
      "/all-artworks/:id/like",
      firebaseVerifyToken,
      async (req, res) => {
        try {
          const id = req.params.id;
          const { action } = req.body;

          if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid ID" });
          }

          const change = action === "dec" ? -1 : 1;

          const updated = await artworkCollection.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { likesCount: change } }
          );

          if (updated.matchedCount === 0) {
            return res.status(404).json({ message: "Artwork not found" });
          }

          res.send({ success: true });
        } catch (err) {
          res.status(500).json({ message: "Server error" });
        }
      }
    );

    // Add Feedback
    app.post("/feedbacks", async (req, res) => {
      try {
        const data = req.body;
        const result = await feedbackCollection.insertOne(data);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Failed to add to feedbacks",
        });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send({ message: "server is running" });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
