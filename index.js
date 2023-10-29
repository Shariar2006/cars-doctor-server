const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wjuagmt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const serverCollection = client.db('carDoctor').collection('services');
    const orderCollection = client.db('carDoctor').collection('orderedServices');


    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false
        })
        .send({ success: true })
    })



    app.get('/services', async (req, res) => {
      const cursor = serverCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const options = {
        projection: { title: 1, service_id: 1, price: 1, img: 1 }
      }
      const result = await serverCollection.findOne(query, options)
      res.send(result)
    })


    app.get('/orderedService', verifyToken, async (req, res) => {
      console.log('ttt token', req.cookies.token)
      console.log("user in the valid token", req.user)
      if(req.query.email !== req.user.email){
        return res.status(403).send({message: 'forbidden user'})
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await orderCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/orderedService', async (req, res) => {
      const ordered = req.body;
      console.log(ordered)
      const result = await orderCollection.insertOne(ordered)
      res.send(result)
    })

    app.patch('/orderedService/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateOrder = req.body;
      console.log(updateOrder)
      const updateDoc = {
        $set: {
          status: updateOrder.status
        }
      }
      const result = await orderCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/orderedService/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await orderCollection.deleteOne(query);
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('car doctor server is running')
})

app.listen(port, () => {
  console.log('car doctor server is running')
})