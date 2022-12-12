const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
const env = require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { TEXT } = require("sequelize");

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: TEXT,
});

Note.belongsTo(User);
User.hasMany(Note);

User.beforeCreate(async (user, options) => {
  const hashedPassword = await bcrypt.hash(
    user.password,
    Number(process.env.SALT_VALUE)
  );
  user.password = hashedPassword;
});

User.byToken = async (token) => {
  try {
    const decode = jwt.verify(token, process.env.JWT);
    const user = await User.findByPk(decode.user.id);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });

  const matches = await bcrypt.compare(password, user.password);
  if (user && matches) {
    return jwt.sign({ user }, process.env.JWT);
  }

  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const notes = [
    { text: "BLAHBLAHBLAHBLAHBLAHBLAH", userId: 1 },
    { text: "Coding is Fun!!!", userId: 1 },
    { text: "Note.belongsToOne is not a function", userId: 2 },
    { text: "listening on port 8080", userId: 2 },
    { text: "[nodemon] starting `node server.js`", userId: 3 },
  ];

  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  const notePromise = await Promise.all(notes.map((note) => Note.create(note)));

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
