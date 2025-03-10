const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const BookedSessionCollection = client.db('collaborativeStudy').collection('bookedSession');
    const reviewCollection = client.db('collaborativeStudy').collection('review');
    const createNotesCollection = client.db('collaborativeStudy').collection('createNotes');
    const materialsCollection = client.db('collaborativeStudy').collection('materials');
    const rejectionCollection = client.db('collaborativeStudy').collection('rejections');

    // jwt related api 
    app.post('/jwt', async(req, res) => {
      const user = req.body 
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'5h'})
      res.send({token})
    })

    // middleware 
    const verifyToken = (req, res, next) => {
      console.log('Inside verify token', req.headers.authorization )
      if(!req.headers.authorization){
        return res.status(401).send({message:'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if(error){
          return res.status(401).send({message:'unauthorized access'})
        }
        req.decoded = decoded
        next()
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email 
      const query = {email: email}
      const user = await studentCollection.findOne(query)
      const isAdmin = user?.role === "admin"
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }

    //students related api 
    app.post('/students', async(req, res) => {
        const student = req.body;
        //insert email if student does not exist add the time of login
        const query = {email: student.email};
        const existsStudent = await studentCollection.findOne(query)
        if(existsStudent){
            return res.send({message: 'Student already exists', insertedId: null})
        }
        const result = await studentCollection.insertOne(student);
        res.send(result);
    })
    
    //=================================================== tutor
    // post method for create study session(tutor) 
    app.post('/studySessions', async(req, res) => {
      const newSession = req.body;
      const result = await studySessionCollection.insertOne(newSession)
      res.send(result)
    })

    //get method for getting 6 study sessions for home page(home)
    app.get('/studySessions', async(req, res) => {
      const result = await studySessionCollection.find().limit(8).toArray()
      res.send(result)
    })
    
    //get method for getting one specific study session for readMore page(home)
    app.get('/studySessions/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await studySessionCollection.findOne(query)
      res.send(result)
    })

    //get method for getting all tutors for home page(home)
    app.get('/students/tutor', async(req, res) => {
      const result = await studentCollection.find({role:'tutor'}).toArray()
      res.send(result)
    })

    // patch method for reRequest for view all study tutor (tutor)
    app.patch('/studySessionsApproval/:id', async(req, res)  => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const reRequest = req.body
      const updateDoc = {
        $set: {
          status: reRequest.status
        }
      }
      const result = await studySessionCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    //post materials data for upload materials page(tutor)
    app.post('/materials', async(req, res) => {
      const newMaterials = req.body 
      const result = await materialsCollection.insertOne(newMaterials)
      res.send(result)
    })

    // get method for getting all materials for view all materials page (student)====
    app.get('/materialsAllData', async(req, res) => {
      const result = await materialsCollection.find().toArray()
      res.send(result)
    })

    // get method for tutor materials page (tutor)======
    app.get('/allStudySessionData', async(req, res) => {
      const {email, status} = req.query 
      const query = {tutorEmail:email, status:status}
      const result = await studySessionCollection.find(query).toArray()
      res.send(result)
    })

    //get method for getting all materials for vew all materials page (student)
    app.get('/studySessionsAllData/:id', async(req, res) => {
      const studySessionId = req.params.id;
      const query = { _id: new ObjectId(studySessionId) }; 
      const result = await studySessionCollection.findOne(query);
      console.log(result)
      res.send(result)
    })

    // get materials for view materials page (tutor)
    app.get('/viewMaterialsTutor/:email', async(req, res) => {
      const email = req.params.email 
      const query = {tutorEmail:email}
      const result = await materialsCollection.find(query).toArray()
      res.send(result)
    })

    //get material for update materials page (tutor)
    app.get('/getMaterialForUpdate/:id', async(req, res) => {
      const id = req.params.id 
      const query = {_id:new ObjectId(id)}
      const result = await materialsCollection.findOne(query)
      res.send(result)
    })
    //patch material for update materials page (tutor)
    app.patch('/materialsUpdate/:id', async(req, res) => {
      const id = req.params.id 
      const query = {_id:new ObjectId(id)}
      const updateData = req.body  
      const updateDoc = {
        $set: {
          title:updateData.title,
          image:updateData.image,
          googleLink:updateData.googleLink,
        }
      }
      const result = await materialsCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    //delete material for view all materials (tutor)
    app.delete('/deleteMaterial/:id', async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await materialsCollection.deleteOne(query)
      res.send(result)
    })

    //============================= admin

    // check student tutor and admin 
    app.get('/users/role/:email', async(req, res) => {
      const email = req.params.email 
      const result = await studentCollection.findOne({email})
      res.send({role: result?.role})
    })

    //get method for getting all study sessions(tutor)
    app.get(`/studySessionsAll/:email`, async(req, res) => {
      const email = req.params.email 
      const query = {tutorEmail:email}
      const result = await studySessionCollection.find(query).toArray()
      res.send(result)
    })
    
    // after filtering get data for view all study page (admin)
    app.get('/studySessionsAllFilter', verifyToken, verifyAdmin, async(req, res) => {
      const query = {status: {$ne:'rejected'}}
      const result = await studySessionCollection.find(query).toArray()
      res.send(result)
    })

    // update registration fee for view all study session(admin)
    app.patch('/studySessionsAll/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const updateData = req.body;
      const updateDoc = {
        $set: {
          registrationFee:updateData.registrationFee,
          status:updateData.status,
        }
      }
      const result = await studySessionCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    
    //patch method for rejection status for view all study session(admin)
    app.patch('/studySession/rejected/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id 
       const query = {_id: new ObjectId(id)}
       const rejectedData = req.body 
       const updateDoc = {
        $set: {
          status:rejectedData.status
        }
       }
       const result = await studySessionCollection.updateOne(query, updateDoc)
       res.send(result)
    })

    // delete method for view all study session(admin)
    app.delete('/studySessionsAll/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await studySessionCollection.deleteOne(query) 
      res.send(result)
    })

    //delete method for all user page(admin)
    app.delete('/users/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await studentCollection.deleteOne(query)
      res.send(result)
    })
    //update role for admin page(admin)
    app.patch('/users/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id 
      const data = req.body
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role:data.role
        }
      }
      const result = await studentCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // search bar for all users page (admin)
    app.get('/users', verifyToken, verifyAdmin, async(req, res) => {
      // const {search} = req.query 
      const search = req.query.search || "";
      const query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },  
          { email: { $regex: search, $options: 'i' } } 
        ]
      };
      const result = await studentCollection.find(query).toArray()
      res.send(result)
    })

    // patch method update all study session (admin)
    app.patch("/updateAllStudySession/:id", verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const allUpdateData = req.body
      const updateDoc = {
        $set: {
          title:allUpdateData.title,
          description:allUpdateData.description,
          tutorName:allUpdateData.tutorName,
          tutorEmail:allUpdateData.tutorEmail,
          resStartDate:allUpdateData.resStartDate,
          resEndDate:allUpdateData.resEndDate,
          claStartDate:allUpdateData.claStartDate,
          claEndDate:allUpdateData.claEndDate,
          sessionDuration:allUpdateData.sessionDuration,
          registrationFee:allUpdateData.registrationFee,
          image:allUpdateData.image,
        }
      }
      const result = await studySessionCollection.updateMany(query, updateDoc)
      res.send(result)
    })

    // get all materials for view all materials page (admin)
    app.get('/allMaterialsAdmin', verifyToken, verifyAdmin, async(req, res) => {
      const result = await materialsCollection.find().toArray()
      res.send(result)
    })

    //delete all material for view all materials  (admin)
    app.delete('/deleteMaterialsData/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await materialsCollection.deleteOne(query)
      console.log(result)
      res.send(result)
    })

    //post method for rejection collection(admin) 
    app.post('/rejections', async(req, res) => {
      const newRejection = req.body 
      const result = await rejectionCollection.insertOne(newRejection)
      res.send(result)
    } )

    //get method for rejection data for view all study tutor page (tutor)
    app.get('/rejectionsData', async(req, res) => {
      const result = await rejectionCollection.find().toArray()
      res.send(result)
    })
    
    // get allUsers for admin home page (admin)
    app.get('/allUsers', async(req, res) => {
      const result = await studentCollection.find().toArray()
      res.send(result)
    })
    // get all study sessions for admin home page (admin)
    app.get('/allStudySession', async(req, res) => {
      const result = await studySessionCollection.find().toArray()
      res.send(result)
    })
    // get all materials for admin home page (admin)
    app.get('/allMaterials', async(req, res) => {
      const result = await materialsCollection.find().toArray()
      res.send(result)
    })

    //===================================== student
    // post method for booked session
    app.post('/bookedSession', async(req, res) => {
      const newBookedSession = req.body
      const result = await BookedSessionCollection.insertOne(newBookedSession)
      res.send(result)
    })

    //get session Id for material page(tutor)=====
    app.get('/bookedSessionId', async(req, res) => {
      const result = await BookedSessionCollection.find().toArray()
      res.send(result)
    })

    //get method for getting one specific data for view booked session(student)
    app.get('/bookedSession/:id', async(req, res) => {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await BookedSessionCollection.findOne(query)
      res.send(result)
    })
    
    //get method for getting all data for booked session(student)
    app.get('/bookedSessions/:email', async(req, res) => {
      const email = req.params.email
      const query = {studentEmail:email}
      const result = await BookedSessionCollection.find(query).toArray()
      res.send(result)
    })

    //post method for review and rating save from details page(student)
    app.post('/reviews', async(req, res) => {
      const newReview = req.body;
      const result = await reviewCollection.insertOne(newReview)
      res.send(result)
    })

    //get method for getting all review for read more page(student)
    app.get('/reviews', async(req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })

    //post method for create note (student)
    app.post('/notes', async(req, res) => {
      const newNote = req.body
      const result = await createNotesCollection.insertOne(newNote)
      res.send(result)
    })
    
    // delete method for deleting note form manage personal notes page(student)
    app.delete('/notes/:id', async(req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await createNotesCollection.deleteOne(query)
      res.send(result)
    })

    //get method for getting one specific data for update page(student)
    app.get('/updateNotes/:id', async(req, res)=> {
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await createNotesCollection.findOne(query)
      res.send(result)
    })

    // patch method for update data for manage personal notes page (student)
    app.patch('/updateStudentNote/:id', async(req, res) => {
      const id = req.params.id 
      const filter = {_id: new ObjectId(id)}
      const updateData = req.body
      const updateDoc = {
        $set: {
          title:updateData.title,
          description:updateData.description
        }
      }
      const result = await createNotesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    //get method for getting all notes by email for manage personal notes page(student)
    app.get('/allNotes/:email', async(req, res) => {
      const email = req.params.email 
      const query = {studentEmail: email}
      const result = await createNotesCollection.find(query).toArray()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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

