// routes/order.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const dataPath = path.join(__dirname, '../data/order_data.json');

// 📦 ตั้งค่าอัปโหลด PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 🧾 Preview PDF
router.get('/preview/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  res.sendFile(filePath);
});


// 📝 GET ฟอร์มเพิ่มคำสั่ง
router.get('/', (req, res) => {
  res.render('order_form');
});

// 💾 POST บันทึกคำสั่ง
router.post('/', upload.single('pdfFile'), (req, res) => {
  const orders = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];

  const exists = orders.find(item => item.orderNo === req.body.orderNo);
  if (exists) {
    return res.json({ success: false, message: 'เลขที่คำสั่งซ้ำกัน!' });
  }

  const newOrder = {
    orderNo: req.body.orderNo,
    subject: req.body.subject,
    orderDate: req.body.orderDate,
    department: req.body.department,
    pdfFile: req.file ? req.file.filename : null
  };

  orders.push(newOrder);
  fs.writeFileSync(dataPath, JSON.stringify(orders, null, 2));
  res.json({ success: true });
});

// 📋 รายการคำสั่ง
router.get('/list', (req, res) => {
  const orders = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];
  res.render('order_list', { data: orders });
});

// ✏️ GET แก้ไขคำสั่ง
router.get('/edit/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const orders = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];

  res.render('order_edit_form', { order: orders[id], index: id });
});

// 💾 POST แก้ไขคำสั่ง
router.post('/edit/:id', upload.single('pdfFile'), (req, res) => {
  const id = parseInt(req.params.id);
  let orders = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];

  orders[id] = {
    ...orders[id],
    orderNo: req.body.orderNo,
    subject: req.body.subject,
    orderDate: req.body.orderDate,
    department: req.body.department,
    pdfFile: req.file ? req.file.filename : orders[id].pdfFile
  };

  fs.writeFileSync(dataPath, JSON.stringify(orders, null, 2));
  res.redirect('/order/list');
});

// 🗑 POST ลบ
router.post('/delete/:id', (req, res) => {
  if (!fs.existsSync(dataPath)) return res.redirect('/order/list');

  const orders = JSON.parse(fs.readFileSync(dataPath));
  const id = parseInt(req.params.id);

  const fileToDelete = orders[id]?.pdfFile;
  if (fileToDelete && fs.existsSync(`uploads/${fileToDelete}`)) {
    fs.unlinkSync(`uploads/${fileToDelete}`);
  }

  orders.splice(id, 1);
  fs.writeFileSync(dataPath, JSON.stringify(orders, null, 2));
  res.redirect('/order/list');
});

// 📥 Export Excel
const ExcelJS = require('exceljs');

router.get('/export', async (req, res) => {
  const orders = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Orders');

  worksheet.columns = [
    { header: 'เลขที่คำสั่ง', key: 'orderNo', width: 20 },
    { header: 'เรื่อง', key: 'subject', width: 30 },
    { header: 'สั่ง ณ วันที่', key: 'orderDate', width: 15 },
    { header: 'การปฏิบัติ', key: 'department', width: 20 }
  ];

  orders.forEach(order => {
    worksheet.addRow({
      orderNo: order.orderNo || '',
      subject: order.subject || '',
      orderDate: order.orderDate || '',
      department: order.department || ''
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=order_export.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});


module.exports = router;
