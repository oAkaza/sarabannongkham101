const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 📁 Path ไปยังไฟล์ JSON
const dataPath = path.join(__dirname, '../data/certify_data.json');

// 📂 ตั้งค่าการอัปโหลดเฉพาะไฟล์ PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์ PDF เท่านั้น'), false);
    }
  }
});

// 🔄 โหลดข้อมูลจากไฟล์ JSON
function readData() {
  return fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    : [];
}

// 📄 หน้าเพิ่มหนังสือรับรอง
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('certify_form');
});

// 💾 เพิ่มข้อมูล
router.post('/', upload.single('pdfFile'), (req, res) => {
  const { certifyNo, subject, certifyDate, action } = req.body;
  const data = readData();

  if (data.some(d => d.certifyNo === certifyNo)) {
    return res.send('เลขที่รับรองซ้ำ');
  }

  const newItem = {
    certifyNo,
    subject,
    certifyDate,
    action,
    pdfFile: req.file ? req.file.filename : null
  };

  data.push(newItem);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.send('บันทึกสำเร็จ');
});

// 📋 รายการทั้งหมด
router.get('/list', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const data = readData();
  res.render('certify_list', { data });
});

// ✏️ แก้ไข
router.get('/edit/:index', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const index = parseInt(req.params.index);
  const data = readData();
  const certify = data[index];
  if (!certify) return res.send('ไม่พบรายการ');
  res.render('certify_edit_form', { certify, index });
});

router.post('/edit/:index', upload.single('pdfFile'), (req, res) => {
  const index = parseInt(req.params.index);
  const { certifyNo, subject, certifyDate, action } = req.body;
  const data = readData();
  const item = data[index];
  if (!item) return res.send('ไม่พบรายการ');

  if (req.file && item.pdfFile) {
    const oldPath = path.join(__dirname, '../uploads', item.pdfFile);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  data[index] = {
    certifyNo,
    subject,
    certifyDate,
    action,
    pdfFile: req.file ? req.file.filename : item.pdfFile
  };

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.redirect('/certify/list');
});

// 🗑️ ลบพร้อมไฟล์
router.post('/delete/:index', (req, res) => {
  const index = parseInt(req.params.index);
  const { confirmPassword } = req.body;

  if (confirmPassword !== '1234') {
    return res.status(403).json({ success: false, message: 'รหัสผ่านผิด' });
  }

  const data = readData();
  const item = data[index];
  if (!item) return res.status(404).json({ success: false, message: 'ไม่พบรายการ' });

  if (item.pdfFile) {
    const filePath = path.join(__dirname, '../uploads', item.pdfFile);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  data.splice(index, 1);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

// 📄 แสดงไฟล์ PDF
router.get('/preview/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('ไม่พบไฟล์');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
  res.sendFile(filePath);
});

module.exports = router;
