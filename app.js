const express = require("express")
const dbConnect = require("./config/dbConnect")
const app = express()
const port = 3000;

const userRoute = require("./routes/userRoutes")

app.use(express.json())

// app.use("/", (req, res) => {
//      dbConnect();
//      res.send("Welcome to the Doctor Appointment API");
// })

app.use('/user', userRoute);

dbConnect();

app.listen(port);
