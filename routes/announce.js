const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ExcelJS = require('exceljs');

// ✅ Middleware รองรับ JSON จาก fetch
router.use(express.json());

// 📁 Path ไปยังไฟล์ประกาศ
const dataPath = path.join(__dirname, '../data/announce_data.json');

// 📦 ตั้งค่าการอัปโหลดไฟล์ PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 📝 GET ฟอร์มเพิ่มประกาศ
router.get('/', (req, res) => {
  res.render('announce_form');
});

// 💾 POST เพิ่มประกาศใหม่
router.post('/', upload.single('pdfFile'), (req, res) => {
  const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath)) : [];

  const exists = data.find(d => d.announceNo === req.body.announceNo);
  if (exists) {
    return res.json({ success: false, message: 'เลขที่ประกาศนี้มีอยู่แล้ว!' });
  }

  const newData = {
    announceNo: req.body.announceNo,
    subject: req.body.subject,
    announceDate: req.body.announceDate,
    action: req.body.action,
    pdfFile: req.file ? req.file.filename : null
  };

  data.push(newData);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.json({ success: true, message: 'บันทึกประกาศสำเร็จแล้ว!' });
});

// 📋 GET รายการประกาศทั้งหมด
router.get('/list', (req, res) => {
  const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath)) : [];
  res.render('announce_list', { data });
});

// ✏️ GET แก้ไขประกาศ
router.get('/edit/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath)) : [];

  if (isNaN(id) || id < 0 || id >= data.length) {
    return res.status(404).send('ไม่พบรายการที่จะแก้ไข');
  }

  res.render('announce_edit_form', { announce: data[id], index: id });
});

// 💾 POST แก้ไขประกาศ
router.post('/edit/:id', upload.single('pdfFile'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  let data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath)) : [];

  if (isNaN(id) || id < 0 || id >= data.length) {
    return res.status(400).send('ไม่สามารถแก้ไขรายการนี้ได้');
  }

  data[id] = {
    ...data[id],
    announceNo: req.body.announceNo,
    subject: req.body.subject,
    announceDate: req.body.announceDate,
    action: req.body.action,
    pdfFile: req.file ? req.file.filename : data[id].pdfFile
  };

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.redirect('/announce/list');
});

// 🧹 POST ลบประกาศ + ลบไฟล์ PDF
router.post('/delete/:id', (req, res) => {
  const index = parseInt(req.params.id);
  const { confirmPassword } = req.body;

  if (confirmPassword !== '1234') {
    return res.status(403).send('รหัสผ่านไม่ถูกต้อง');
  }

  if (!fs.existsSync(dataPath)) return res.status(404).send('ไม่พบไฟล์ข้อมูล');
  let data = JSON.parse(fs.readFileSync(dataPath));
  const removed = data.splice(index, 1)[0];

  if (removed && removed.pdfFile) {
    const filePath = path.join(__dirname, '../uploads', removed.pdfFile);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  res.send('ลบเรียบร้อย');
});

// 📥 ดาวน์โหลดเป็น Excel
router.get('/export', async (req, res) => {
  const data = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath)) : [];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Announcements');

  worksheet.columns = [
    { header: 'เลขที่ประกาศ', key: 'announceNo', width: 20 },
    { header: 'เรื่อง', key: 'subject', width: 30 },
    { header: 'วันที่ประกาศ', key: 'announceDate', width: 15 },
    { header: 'การปฏิบัติ', key: 'action', width: 20 }
  ];

  data.forEach(entry => {
    worksheet.addRow({
      announceNo: entry.announceNo || '',
      subject: entry.subject || '',
      announceDate: entry.announceDate || '',
      action: entry.action || ''
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=announce_export.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;
