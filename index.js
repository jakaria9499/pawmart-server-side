const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;



app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hattdo5.mongodb.net/?appName=Cluster0`;

app.get('/',(req, res)=>{
    res.send("pawMart server is running");
})



const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
    try{
        await client.connect();
        await client.db("pawMart").command({ping: 1});

        const db = client.db("pawMart");
        const petsListsCollection = db.collection('listings');
        const ordersCollection = db.collection('orders');


        app.get('/petsSupplies', async (req, res) => {
          const { minPrice, maxPrice, category } = req.query;
                
          const query = {};
                
          if (category) {
            query.category = { $in: category.split(",") };
          }
      
          if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
          }
      
          console.log("QUERY =>", query);
      
          const result = await petsListsCollection.find(query).toArray();
          res.send(result);
        });

       app.get('/petsSupplies/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await petsListsCollection.findOne(query);
            res.send(result);
        })
        
        app.get('/myOrders', async(req, res) => {
            const email = req.query.email;
            const query = {};
            if(email) {query.email = email}
            else return
            const cursor = ordersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })
        app.get('/myLists', async(req, res)=>{
            const email = req.query.email;
            const query = {};
            if(email) {query.email = email}
            else return
            const cursor = petsListsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })
        app.get('/recentList',async(req,res)=>{
            const cursor = petsListsCollection.find({ date: { $exists: true } }).sort({date: -1}).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })
        
        app.post('/addList', async(req, res) => {
            const newList = req.body;
            const result = await petsListsCollection.insertOne(newList);
            res.send(result);
        })
        app.post('/orders', async(req, res) => {
            const newOrder = req.body;
            const result = await ordersCollection.insertOne(newOrder);
            res.send(result);

        })


    }
    finally {

    }
}
run().catch(console.dir);


app.listen(port, ()=>{
    console.log(`pawMart server is running on port: ${port}`);
})
