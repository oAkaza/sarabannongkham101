const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

// 📦 ดึง Router
const authRoute = require('./routes/auth');
const dashboardRoute = require('./routes/dashboard');
const bookInRoute = require('./routes/book_in');
const bookOutRoute = require('./routes/book_out');
const noteRouter = require('./routes/note');
const orderRoute = require('./routes/order');
const announceRouter = require('./routes/announce');
const certifyRouter = require('./routes/certify');

const app = express();
const PORT = 3000;

// 🧠 ตั้งค่า View
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 🗂️ Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔧 Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// 🔐 Session
app.use(session({
  secret: 'saraban-secret',
  resave: false,
  saveUninitialized: true
}));

// 🛣️ Routing
app.use('/', authRoute);
app.use('/dashboard', dashboardRoute);
app.use('/book-in', bookInRoute);
app.use('/book-out', bookOutRoute);
app.use('/note', noteRouter);         // ✅ เปลี่ยนจาก '/' เป็น '/note'
app.use('/order', orderRoute);        // ✅ เปลี่ยนจาก '/' เป็น '/order'
app.use('/announce', announceRouter); // ✅ เปลี่ยนจาก '/' เป็น '/announce'
app.use('/certify', certifyRouter);   // ✅ คงไว้เหมือนเดิม
// เพิ่มนี้ก่อน listen
app.get('/', (req, res) => {
  res.redirect('/login'); // หรือ res.render('login')
});


// 🚀 Start Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


