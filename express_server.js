const express = require("express");
const bodyParser = require("body-parser");
let morgan = require('morgan');
const cookieSession = require('cookie-session');
let bcrypt = require('bcryptjs');

const app = express();
const PORT = 8080; // default port 8080

////// USE
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
}));

////// SET
app.set("view engine", "ejs");

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" },
  i3Botr: { longURL: "https://www.google.ca", userID: "hsdjfgh" }
};

const users = {
  "aJ48lW": {
    id: "aJ48lW",
    email: "user@example.com",
    password: "$2a$10$sOiZBpJdlGX0EJWF5AGR/.XXpxMKBzpE9kR7BqVgW3YzKos73Bexi"
  }
};

// Helper functions
const { getUserByEmail, generateRandomString } = require('./helpers');

const emailExist = function(email) {
  for (let key in users) {
    if (users[key].email === email) return true;
    return false;
  }
};
const urlsForUser = function(id) {
  let result = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      result[url] = {
        longURL: urlDatabase[url].longURL,
        userID: urlDatabase[url].userID
      };
    }
  }
  return result;
};

// Main page
app.get("/", (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    res.redirect("/login");
    return;
  }
  res.redirect("/urls");
});

// /login
app.get("/login", (req, res) => {
  let templateVars;
  const id = req.session.user_id;
  if (id) {
    res.redirect("/urls");
    return;
  }

  let user = null;
  for (const key in users) {
    if (key === id) {
      user = users[key];
    }
  }
  templateVars = { user };
  res.render("urls_login", templateVars);
});

app.post("/login", function(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  if (email === "" || password === "") {
    res.status(400);
    res.send('Email or password are blank');
    return;
  }

  const user = getUserByEmail(users, email);
  if (!user) {
    res.status(403).send('Incorrect user or password');
    return;
  }

  if (!bcrypt.compareSync(password, user.password)) {
    res.status(403).send('Incorrect user or password');
    return;
  }

  req.session.user_id = user.id;
  res.redirect(`/urls`);
});

// /logout
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});
  
// /register
app.get("/register", (req, res) => {
  let templateVars;
  
  const id = req.session.user_id;
  if (id) {
    res.redirect("/urls");
    return;
  }

  let user = null;
  for (const key in users) {
    if (key === id) {
      user = users[key];
    }
  }
  templateVars = { user };
  res.render("urls_register", templateVars);
});

app.post('/register', function(req, res) {
  const userID = generateRandomString();
  const email = req.body.email;
  const password = bcrypt.hashSync(req.body.password, 10);
  
  if (email === "" || password === "") {
    res.status(400);
    res.send('Email or password are blank');
    return;
  }

  if (emailExist(email)) {
    res.status(400);
    res.send('Email already registered. Login instead');
    return;
  }
  
  req.session.user_id = userID;
  const newUser = { id: userID, email, password };
  users[userID] = newUser;
  res.redirect("/urls");
  
});

// /urls
app.get("/urls", (req, res) => {
  let templateVars;
  const userID = req.session.user_id;
  if (!userID) {
    res.status(403);
    res.send('You have to register/login first');
    return;
  }

  let user = null;
  for (const key in users) {
    if (key === userID) {
      user = users[key];
    }
  }
  templateVars = {
    user,
    urls: urlsForUser(userID)
  };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  let longURL = req.body.longURL;
  let userID = req.session.user_id;

  urlDatabase[shortURL] = {longURL, userID};
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls/new", (req, res) => {
  const id = req.session.user_id;
  if (!id) {
    res.status(403).send('You have to register/login first');
    return;
  }

  const user = users[id];
  if (!user) {
    res.redirect(`/login`);
    return;
  }

  let templateVars = { user };
  res.render("urls_new", templateVars);
});

// /urls/:shortURL
app.get("/urls/:shortURL", (req, res) => {
  const id = req.session.user_id;
  if (!urlsForUser(id).userID === id) {
    res.send('Did you created this short URL? You have to register/login first to access it');
    return;
  }

  let user = null;
  for (const key in users) {
    if (key === id) {
      user = users[key];
    }
  }
  if (!id) {
    res.send('User not logged in');
    return;
  }

  const shortURL = req.params.shortURL;
  const urlRecord = urlDatabase[shortURL];
  if (!urlRecord) {
    res.status(403);
    res.send('Not allowed');
    return;
  }
  
  if (urlRecord.userID !== req.session.user_id) {
    res.send('URL unavailable');
    return;
  }

  const longURL = urlRecord.longURL;
  let templateVars = {
    user,
    shortURL,
    longURL
  };
  res.render("urls_show", templateVars);
});

// /u/:shortURL
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const urlRecord = urlDatabase[shortURL];
  const longURL = urlRecord.longURL;
  
  if (!urlRecord) {
    res.status(403);
    res.send('Short URL not found');
    return;
  }
  res.redirect(longURL);
});

// /urls/:id
app.post("/urls/:id", (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    res.status(403);
    res.send('No user');
    return;
  }

  const shortURL = req.params.id;
  const longURL = req.body.longURL;
  const urlRecord = { longURL, userID };
  if (urlRecord.userID !== userID) {
    res.send('URL unavailable');
    return;
  }

  urlDatabase[shortURL] = urlRecord;
  res.redirect("/urls");
});

// /urls/:shortURL/delete
app.post("/urls/:shortURL/delete", (req, res) => {
  const id = req.session.user_id;
  if (!id) {
    res.status(403);
    res.send('No user');
    return;
  }

  const shortURL = req.params.shortURL;
  const urlRecord = urlDatabase[shortURL];
  if (!urlRecord || urlRecord.userID !== id) {
    res.status(403);
    res.send('Not allowed');
    return;
  }

  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

////// LISTEN
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

