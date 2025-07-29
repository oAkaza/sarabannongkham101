const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const dataPath = path.join(__dirname, '../data/book_out.json');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname); // ใช้นามสกุลเดิม
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});


// 🔹 อ่าน JSON
function readData() {
  return fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    : [];
}

// 🔸 หน้าแบบฟอร์มหนังสือส่ง
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('book_out_form');
});

// 🔸 เพิ่มรายการใหม่
router.post('/', upload.single('pdfFile'), (req, res) => {
  const { registerNo, speed, docNo, docDate, sendTime, from, to, subject, action } = req.body;
  let data = readData();

  if (data.some(d => d.registerNo === registerNo)) {
    return res.send('เลขทะเบียนส่งนี้มีอยู่แล้ว!');
  }

  const newEntry = {
    registerNo,
    speed,
    docNo,
    docDate,
    sendTime,
    from,
    to,
    subject,
    action,
    pdfFile: req.file ? req.file.filename : null
  };

  data.push(newEntry);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.send('บันทึกข้อมูลหนังสือส่งเรียบร้อยแล้ว');
});

// 🔸 แสดงรายการ
router.get('/list', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const data = readData();
  res.render('book_out_list', { data });
});

// 🔸 แก้ไขรายการ
router.get('/edit/:index', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const data = readData();
  const index = parseInt(req.params.index);
  const item = data[index];
  if (!item) return res.send('ไม่พบรายการ');
  res.render('book_out_edit_form', { item, index });
});

router.post('/edit/:index', upload.single('pdfFile'), (req, res) => {
  const index = parseInt(req.params.index);
  const { registerNo, speed, docNo, docDate, sendTime, from, to, subject, action } = req.body;

  const data = readData();
  const existing = data[index];
  if (!existing) return res.send('ไม่พบรายการ');

  // ลบไฟล์เก่า ถ้ามี และมีไฟล์ใหม่มาแทน
  if (req.file && existing.pdfFile) {
    const oldPath = path.join(__dirname, '../uploads', existing.pdfFile);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  data[index] = {
    ...existing,
    registerNo,
    speed,
    docNo,
    docDate,
    sendTime,
    from,
    to,
    subject,
    action,
    pdfFile: req.file ? req.file.filename : existing.pdfFile
  };

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.redirect('/book-out/list');
});

// 🔸 ลบรายการ
router.post('/delete/:index', (req, res) => {
  const { confirmPassword } = req.body;
  const index = parseInt(req.params.index);
  if (confirmPassword !== '1234') return res.sendStatus(403);

  const data = readData();
  const item = data[index];

  // ลบไฟล์ PDF ถ้ามี
  if (item?.pdfFile) {
    const filePath = path.join(__dirname, '../uploads', item.pdfFile);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  data.splice(index, 1);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.sendStatus(200);
});

// 🔸 พรีวิวไฟล์ PDF
router.get('/preview/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('ไม่พบไฟล์');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
  res.sendFile(filePath);
});

// 🔸 Export Excel (ไว้พัฒนาในรอบหน้า)
router.get('/export', (req, res) => {
  res.send('ยังไม่ได้เขียน export excel น้า 😄');
});

module.exports = router;
