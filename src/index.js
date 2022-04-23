const express = require('express');
const bodyParser = require('body-parser');
const route = require('./routes/route.js');
const  mongoose  = require('mongoose');
const app = express();
const multer = require("multer")


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().any())


mongoose.connect(
    "mongodb+srv://pranali:a8nUBuLVvqzszy09@cluster0.6luou.mongodb.net/group37Database?retryWrites=true&w=majority",
    {
        useNewUrlParser: true
    })
    .then(() => console.log("MongoDb is connected"))
    .catch(err => console.log(err))


app.use('/', route);


app.listen( 3000, function () {
    console.log('Express app running on port ' + 3000)
});