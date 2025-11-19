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

    // Get Data(likes count)
    app.get("/trending-artwork", async (req, res) => {
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
    app.get("/most-recent", async (req, res) => {
      try {
        const result = await artworkCollection
          .find({}) // find() function ব্যবহার করা হচ্ছে
          .sort({ createdAt: -1 }) // সর্বশেষ ক্রিয়েটেড আগে আসবে
          .limit(6)
          .toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error(error);
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
