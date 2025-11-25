const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://artifyAdmin:nvAV4rTWZPNkidjG@cluster0.urzvqyi.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("artifyDB");
    const artworkCollection = database.collection("artworks");
    const favouritesCollection = database.collection("favouritesArtworks");

    // Get Data(all artworks)

    app.get("/all-artworks", async (req, res) => {
      try {
        const result = await artworkCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Get Data(likes count)
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
          .limit(6)
          .toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
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
    app.post("/favourites", async (req, res) => {
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
    app.get("/favourites-data", async (req, res) => {
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

    // Unfavourite artwork

    app.delete("/unfavourite/:id", async (req, res) => {
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

    app.post("/all-artworks", async (req, res) => {
      const artworkData = req.body;
      const result = await artworkCollection.insertOne(artworkData);
      res.send(result);
    });

    // Delete Artworks
    app.delete("/delete-artworks/:id", async (req, res) => {
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
    });

    // Update Artwork

    app.put("/update-artwork/:id", async (req, res) => {
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

    app.get("/my-gallery", async (req, res) => {
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

    app.patch("/all-artworks/:id/like", async (req, res) => {
      try {
        const id = req.params.id;
        const { action } = req.body; // "inc" or "dec"

        if (!ObjectId.isValid(id))
          return res.status(400).json({ message: "Invalid ID" });

        const value = action === "dec" ? -1 : 1;

        const result = await artworkCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { likesCount: value } },
          { returnDocument: "after" }
        );

        if (!result)
          return res.status(404).json({ message: "Artwork not found" });

        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
