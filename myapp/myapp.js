var express = require('express');
var app = express();
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
const helmet = require("helmet")

app.use(express.static('files'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet.frameguard());

const homepage=`
<div class="full-width">Welcome</div>
<div align="center"><button type="button" onclick="window.location.href='/login'">Login</button></div>
`

const css = `
<style>
body {
  margin: 0;
  padding: 0;
}

.full-width {
  width: 100%;
  text-align: center;
  font-size: 22vw;
  margin-top: 100px;
}

.dashboard {
  display: flex;
  height: 100vh;
}

.header {
  background-color: #282c34;
  color: white;
  padding: 1rem;
}

.sidebar {
  background-color: #f1f1f1;
  width: 15%;
  padding: 1rem;
}

.sidebar ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.main-content {
  width: 85%;
  padding: 1rem;
}

.widgets {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}

.widget {
  background-color: #f8f8f8;
  padding: 1rem;
  width: 30%;
  text-align: center;
  border-radius: 5px;
}

button {
    width: 80%;
    align: center;
    padding: 15px; /* add some padding to the button */
    font-size: 18px; /* increase the font size */
    background-color: black; /* change the background color */
    color: white; /* change the text color */
    border: none; /* remove the border */
    border-radius: 4px; /* add rounded corners */
    cursor: pointer; /* change cursor to pointer on hover */
}

button:hover {
  background-color: grey;
}

</style>
`

const dashboard = `
<div class="dashboard">
  <div class="header">
    <h1>Dashboard</h1>
  </div>
  <div class="sidebar">
    <ul>
      <li><a href="#">Home</a></li>
      <li><a href="#">Reports</a></li>
      <li><a href="#">Settings</a></li>
    </ul>
  </div>
  <div class="main-content">
    <h2>Welcome Bob</h2>
    <div class="widgets">
      <div class="widget">
        <h3>Total Sales</h3>
        <p>$15,000</p>
      </div>
      <div class="widget">
        <h3>Visitors</h3>
        <p>5,000</p>
      </div>
      <div class="widget">
        <h3>Conversion Rate</h3>
        <p>3%</p>
      </div>
    </div>
  </div>
</div>
`

app.get('/', function(req, res) {
 if (req.cookies.SESSION === "c32272b9-99d8-4687-b57e-a606952ae870") {
   res.send("<html><body>"+css+dashboard+"</body></html>");
 } else {
   res.send("<html><body>"+css+homepage+"</body></html>");
 }
});
app.listen(3000);
console.log("Listening on port 3000...");

app.get('/login', (req, res) => {
  res.send(`
    <h1>Login</h1>
    <form method="POST">
      <input type="text" name="username" placeholder="Username" />
      <input type="password" name="password" placeholder="Password" />
      <button type="submit">Sign In</button>
    </form>
  `);
});

app.post('/login', (req, res) => {
  // Get the username and password from the request body
  const { username, password } = req.body;

  // Check if the username and password are valid
  if (username === 'bob' && password === 'bob') {
    // Valid credentials, set session cookie
    res.cookie('SESSION', "c32272b9-99d8-4687-b57e-a606952ae870", {
      httpOnly: true,
      secure: true
    });
    res.redirect('/');
  } else {
    res.send('Invalid username or password');
  }
});

