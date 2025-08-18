const express = require("express")
const dbConnect = require("./config/dbConnect")
const app = express()
const port = 5000;
const cors = require("cors");
const Path = require("path");


const userRoute = require("./routes/userRoutes")
const doctorRoute = require("./routes/doctor")

app.use(express.json())
app.use(cors());

// app.use("/", (req, res) => {
//      // dbConnect();
//      res.send("Welcome to the Doctor Appointment API");
// })

app.use("/uploads", express.static(Path.join(__dirname,"uploads")));

app.use('/user', userRoute);
app.use('/doctor', doctorRoute);

dbConnect();

app.listen(port);
