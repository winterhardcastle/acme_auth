const express = require("express");
const app = express();
const {
  models: { User, Note },
} = require("./db");
const path = require("path");
const env = require("dotenv").config();

// middleware
app.use(express.json());

const requireToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const user = await User.byToken(token);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ authorization: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", requireToken, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/users/:id/notes", requireToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    // const { token } = req.headers;
    // const user = await User.byToken(token);
    const user = req.user;
    if (user.id != id) throw new Error("token does not match route");
    res.send(
      await Note.findAll({
        where: { userId: id },
      })
    );
  } catch (ex) {
    next(ex);
  }
});

// error handling
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
