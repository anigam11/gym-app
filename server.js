const express = require('express');
const mongoose = require('mongoose');
const exphbs = require("express-handlebars");
const session = require('express-session');

const app = express();

app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    helpers: {
        json: (context) => { return JSON.stringify(context) },
        priceFormatted: (length) => { return (length * 0.65).toFixed(2); }
    },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
      },
  }));
  app.set("view engine", ".hbs");
  
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
  }));

mongoose.connect('mongodb+srv://arnavnigam:LZbUrFAYlHjoJVc5@cluster0.9osf2ix.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true });


const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  theAdmin: { type: Boolean, default: false },
});


const cartItemSchema = new mongoose.Schema({
      username: String,
      Idofclass: String,
      Nameofclass: String,
    });
  

const paymentSchema = new mongoose.Schema({
    username: String,
    Nameofclass: String,
    msrpPrice: Number,
    finalAmount: Number,
    dateofPayment: { type: Date, default: Date.now },
  });

const classSchema = new mongoose.Schema({
  name: String,
  length: Number,
  imageName: String,
});

const User = mongoose.model('User', userSchema);
const Class = mongoose.model('Class', classSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const CartItem = mongoose.model('CartItem', cartItemSchema);

app.get('/', async (req, res) => {
  try {
    const classes = await Class.find();
    res.render('index', { classes, layout: "main", session: req.session });
  } catch (error) {
    console.error(error);
    res.status(500).send('error');
  }
});


app.get('/login', (req, res) => {
      res.render('login', { layout: "main" });
    });
  
  
  app.get('/logout', (req, res) => {
    req.session.destroy(err => { 
      if (err) {
        console.error(err);
        res.status(500).send('Server error');
      } else {
        res.redirect('/');
      }
    });
  });

  function loggingIn(req, res, next) {
    console.log("loggingIn middleware function is called");
    if (req.session && req.session.user) {
      console.log("loggingIn: User is logged in");
      req.session.loggingIn = true; 
      next();
    } else {
      console.log("loggingIn: User is not logged in");
      res.status(401).send('Unauthorized');
    }
  }
  


function theAdmin(req, res, next) {
      if (req.session && req.session.user && req.session.user.theAdmin) {
        next();
      } else {
        res.status(403).send('Prohibited');
      }
    }

  app.post('/auth', async (req, res) => {
    const { username, password, submit } = req.body;
  
    if (submit === 'login') {
      try {
        const user = await User.findOne({ username, password });
        if (user) {
          console.log('User logged in:', user); 
          req.session.user = user;
          req.session.loggingIn = true;
          res.redirect('/classes');
        } else {
          res.status(401).send('username or password not valid');
        }
      } catch (error) {
        console.error(error);
        res.status(500).send('error');
      }
    } else if (submit === 'create-account') {
      try {
        const theAdmin = username === 'admin' && password === '123456';
        const newUser = new User({ username, password, theAdmin: theAdmin });
        await newUser.save();
        req.session.user = newUser;
        res.redirect('/classes');
      } catch (error) {
        console.error(error);
        res.status(500).send(' error');
      }
    } else {
      res.status(400).send('Invalid request');
    }
  });
  

app.get('/admin', loggingIn, theAdmin, async (req, res) => {
  console.log("/admin route handler is called"); 
  try {
    const payments = await Payment.find().sort({ dateofPayment: 1 });
    res.render('admin', { payments, layout: "main" });
  } catch (error) {
    console.error(error);
    res.status(500).send('error');
  }
});


app.get('/classes', async (req, res) => {
    try {
      const classes = await Class.find();
      const loggedIn = req.session && req.session.user;
      res.render('classes', { classes, loggedIn });
    } catch (error) {
      console.error(error);
      res.status(500).send('error');
    }
  });


  app.get('/cart', loggingIn, async (req, res) => {
  try {
    const cartItems = await CartItem.find({ username: req.session.user.username });
    res.render('cart', { cartItems, layout: "main", session: req.session });
  } catch (error) {
    console.error(error);
    res.status(500).send('error');
  }
});


app.post('/class-add/:Idofclass', async (req, res) => {
    if (req.session && req.session.user) {
      try {
        const classSelected = await Class.findById(req.params.Idofclass);
        const msrpPrice = classSelected.length * 0.65;
        const finalAmount = msrpPrice * 1.13;
        const payment = new Payment({
          username: req.session.user.username,
          Nameofclass: classSelected.name,
          msrpPrice,
          finalAmount,
        });
        await payment.save();
        const cartItem = new CartItem({
          username: req.session.user.username,
          Idofclass: classSelected._id,
          Nameofclass: classSelected.name,
        });
        await cartItem.save();
        res.status(200).send('Class booked successfully');
      } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
      }
    } else {
      res.status(401).send('Login Required');
    }
  });
  

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});