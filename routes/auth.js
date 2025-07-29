const express = require('express');
const router = express.Router();

// GET หน้า Login
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'user' && password === '1234') {
    req.session.user = username;
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
});

// POST Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout Error:', err);
      return res.status(500).send("Logout failed");
    }
    res.redirect('/login'); // ✅ redirect มาที่ /login ได้เลย
  });
});

router.get('/', (req, res) => {
  res.redirect('/login');
});


module.exports = router;
