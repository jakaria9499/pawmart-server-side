const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

// index.js
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const verifyFireBaseToken = async (req, res, next) =>{
    const authorization = req.headers.authorization;

    if(!authorization){
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = authorization.split(' ')[1];
    try{
        const decoded = await admin.auth().verifyIdToken(token);
        req.token_email = decoded.email;
        next();
    }
    catch(error) {
        return res.status(401).send({message: "unauthorized access"});
    }
}


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
        
        app.post('/addList', verifyFireBaseToken, async(req, res) => {
            
            const newList = req.body;
            if(newList.email !== req.token_email){
                return res.status(403).send({message: 'Forbidden Access'});
            }
            const result = await petsListsCollection.insertOne(newList);
            res.send(result);
        })
        app.post('/orders', async(req, res) => {
            const newOrder = req.body;
            const result = await ordersCollection.insertOne(newOrder);
            res.send(result);

        })
        app.delete('/product/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await petsListsCollection.deleteOne(query);
            res.send(result);
        })
        app.patch('/update/:id', async(req, res)=>{
            const id = req.params.id;
            const updatedInfo = req.body;
            const query = {_id: new ObjectId(id)};
            const update ={
                $set: {
                    productName: updatedInfo.productName,
                    buyerName: updatedInfo.buyerName,
                    email: updatedInfo.email,
                    price: updatedInfo.price,
                    image: updatedInfo.image,
                    category: updatedInfo.category,
                    location: updatedInfo.address,
                    description: updatedInfo.description,
                }
            }
            const result = await petsListsCollection.updateOne(query, update);
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
