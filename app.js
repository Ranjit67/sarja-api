const express = require("express");
const createError = require("http-errors");
var firebase = require("firebase");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
app.use(morgan("dev"));
//middleware set
app.use(express.json());

//CURS SET
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  //restricted link - https://leacturedot.herokuapp.com
  res.header("Access-Control-Allow-Origin", "*");

  // Request headers you wish to allow
  res.header(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers,X-Access-Token,XKey,Authorization"
  );

  // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (req.method === "OPTIONS") {
    // Request methods you wish to allow
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    return res.status(200).json({});
  }
  // Pass to next layer of middleware
  next();
});
//END curs
//firebase environment
const fire = firebase.initializeApp({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY, // Auth / General Use
  appId: process.env.REACT_APP_FIREBASE_APP_ID, // General Use
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID, // General Use
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN, // Auth with popup/redirect
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL, // Realtime Database
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET, // Storage
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID, // Cloud Messaging
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID, // Analytics
});
const auth = fire.auth();
const database = fire.database();
//end firebase
//route part
app.get("/data", async (req, res, next) => {
  try {
    res.json({ data: "data send" });
  } catch (error) {
    next(error);
  }
});
// functions
const userDataStall = async (data, uid) => {
  await database.ref(`Users/${uid}/`).set(data);
  return 1;
};
const exhibitorStall = async (uid) => {
  await database.ref(`EXHIBITORS/${uid}/stall`).set(uid);
  return 1;
};
const exhibitorStallMember = async (stallID, uid) => {
  await database.ref(`EXHIBITORS/${stallID}/StallMember/${uid}`).set(uid);
  return 1;
};
//function end
//for stall entry
app.post("/", async (req, res, next) => {
  try {
    const { email, password, role, stallID, name, speakerID } = req.body;
    if (!email || !password || !role)
      throw createError.BadRequest(
        "Email,password and role, All three field are required.."
      );
    const response = await auth.createUserWithEmailAndPassword(email, password);
    //stall
    if (role === "stall") {
      const raw = {
        role: "stall",
        stallID: response.user.uid,
        password,
        email,
        isActive: true,
      };
      const userInsert = await userDataStall(raw, response.user.uid);
      if (!userInsert)
        throw createError.Forbidden("Stall does not save in User");
      const exib = await exhibitorStall(response.user.uid);
      if (!exib)
        throw createError.Forbidden("stall does not save in EXHIBITORS.");
      res.json({ data: "stall save success fully..." });
    } else if (role === "StallMember") {
      const stallMemberExibitor = await exhibitorStallMember(
        stallID,
        response.user.uid
      );
      if (!stallMemberExibitor)
        throw createError.Forbidden(
          "Stall member does not save in EXHIBITORS.."
        );
      const rawDataStallMember = {
        role: "StallMember",
        password,
        stallID,
        email,
      };
      const stallMemberUserData = await userDataStall(
        rawDataStallMember,
        response.user.uid
      );
      if (!stallMemberUserData)
        throw Forbidden("Stall member does not save in EXHIBITORS Member");

      res.json({ data: "stall member save successfully.." });
      //speaker
    } else if (role == "speaker") {
      const speakerUser = {
        role: "speaker",
        password,
        email,
      };
      const saveUser = await userDataStall(speakerUser, response.user.uid);
      if (!saveUser)
        throw createError.Forbidden("Speaker does not save in User.");

      res.json({ data: "Speaker is save successfully..." });
    } else if (role === "SpeakerMember") {
      const rawSpeaker = {
        role: "SpeakerMember",
        password,
        speakerID,
        email,
      };
      const saverUserData = await userDataStall(rawSpeaker, response.user.uid);
      if (!saverUserData)
        throw createError.Forbidden("Speaker Member does not save in User");

      res.json({ data: "Speaker member is save successfully... " });
    }
  } catch (error) {
    if (error.status === 500) {
      error.status = 400;
      next(error);
    } else {
      next(error);
    }
  }
});
//route end
//error handel
app.use(async (req, res, next) => {
  next(createError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.status || 400);
  res.send({
    error: {
      status: err.status || 400,
      message: err.message,
    },
  });
});
//error handel end
//port manage
app.listen(process.env.PORT || 5000, () => {
  console.log("5000 port is ready to start");
});
