// Helper functions
const getUserByEmail = (database, email) => {
  let user = null;
  for (let key in database) {
    if (database[key].email === email) {
      user = database[key];
    }
  }
  return user;
};

const generateRandomString = function() {
  return Math.floor((1 + Math.random()) * 0x1000000).toString(16).substring(1);
};

module.exports = { getUserByEmail, generateRandomString }