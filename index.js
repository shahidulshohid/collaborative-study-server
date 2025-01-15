const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const post = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wnw5g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    
    const studentCollection = client.db('collaborativeStudy').collection('students');
    const studySessionCollection = client.db('collaborativeStudy').collection('studySessions');

    //students related api 
    app.post('/students', async(req, res) => {
        const student = req.body;
        //insert email if student does not exist
        const query = {email: student.email};
        const existsStudent = await studentCollection.findOne(query)
        if(existsStudent){
            return res.send({message: 'Student already exists', insertedId: null})
        }
        const result = await studentCollection.insertOne(student);

        //create study session 
        app.post('/studySessions', async(req, res) => {
          const result = await studySessionCollection.insertOne()
          res.send(result)
        })

        // res.send(result);
        console.log(result)
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
    res.send('Collaborative study server is running')
})

app.listen(post, () => {
    console.log(`collaborative study server is running on port ${post}`)
})

