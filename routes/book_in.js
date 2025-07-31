const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ExcelJS = require('exceljs');

// 📁 Path JSON
const dataFile = path.join(__dirname, '../data/book_in.json');

// 📁 Path Google Drive Auth
const { google } = require('googleapis');
const KEYFILEPATH = path.join(__dirname, '../config/google-key.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// 📤 อัปโหลด PDF ไป Google Drive
async function uploadToDrive(filename, filepath) {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });

  const driveService = google.drive({ version: 'v3', auth });
  const fileMetadata = {
    name: filename,
    parents: ['161d34kOPjtd0yzQsi9__sY-TB-IhtywD'],
  };
  const media = {
    mimeType: 'application/pdf',
    body: fs.createReadStream(filepath),
  };

  const file = await driveService.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  return file.data;
}

// ✅ ตั้งค่า Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

// ✅ หน้าเพิ่มหนังสือรับ
router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  let data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];
  res.render('book_in_form', { data });
});

// ✅ เพิ่มรายการใหม่
router.post('/', upload.single('pdfFile'), async (req, res) => {
  const {
    registerNo, receiveDate, receiveTime, docNo, docDate,
    from, to, subject, action, signatureData
  } = req.body;

  let driveFile = null;
  if (req.file) {
    const fileData = await uploadToDrive(req.file.originalname, req.file.path);
    driveFile = {
      name: req.file.originalname,
      driveId: fileData.id,
      viewLink: fileData.webViewLink
    };
  }

  const newEntry = {
    registerNo, receiveDate, receiveTime, docNo, docDate,
    from, to, subject, action,
    pdfFile: driveFile,
    signature: signatureData
  };

  let data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];
  const isDuplicate = data.some(d => d.registerNo === registerNo);
  if (isDuplicate) return res.send('เลขทะเบียนรับนี้มีอยู่แล้ว!');

  data.push(newEntry);
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  res.send('บันทึกข้อมูลหนังสือรับเรียบร้อยแล้ว');
});

// ✅ รายการหนังสือรับ
router.get('/list', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  let data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];
  res.render('book_in_list', { data });
});

// ✅ แก้ไข
router.get('/edit/:index', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const index = parseInt(req.params.index);
  if (!fs.existsSync(dataFile)) return res.send('ไม่พบข้อมูล');

  const data = JSON.parse(fs.readFileSync(dataFile));
  const item = data[index];
  if (!item) return res.send('ไม่พบรายการที่ต้องการแก้ไข');
  res.render('book_in_edit_form', { item, index });
});

// ✅ บันทึกการแก้ไข
router.post('/edit/:index', upload.single('pdfFile'), async (req, res) => {
  const index = parseInt(req.params.index);
  const { registerNo, receiveDate, docNo, from, subject, action, signatureData } = req.body;

  if (!fs.existsSync(dataFile)) return res.send('ไม่พบข้อมูล');
  let data = JSON.parse(fs.readFileSync(dataFile));
  if (!data[index]) return res.send('ไม่พบรายการ');

  let driveFile = data[index].pdfFile;
  if (req.file) {
    const fileData = await uploadToDrive(req.file.originalname, req.file.path);
    driveFile = {
      name: req.file.originalname,
      driveId: fileData.id,
      viewLink: fileData.webViewLink
    };
  }

  data[index] = {
    ...data[index],
    registerNo, receiveDate, docNo, from, subject, action,
    signature: signatureData,
    pdfFile: driveFile
  };

  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  res.redirect('/book-in/list');
});

// ✅ ลบรายการ
router.post('/delete/:index', (req, res) => {
  const { confirmPassword } = req.body;
  const index = parseInt(req.params.index);

  if (confirmPassword !== '1234') return res.sendStatus(403);
  let data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  data.splice(index, 1);
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  res.sendStatus(200);
});

// ✅ export Excel
router.get('/export', (req, res) => {
  if (!fs.existsSync(dataFile)) return res.send('ไม่พบข้อมูล');
  const data = JSON.parse(fs.readFileSync(dataFile));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('หนังสือรับ');

  worksheet.columns = [
    { header: 'เลขทะเบียนรับ', key: 'registerNo', width: 20 },
    { header: 'วันที่รับ', key: 'receiveDate', width: 15 },
    { header: 'เวลา', key: 'receiveTime', width: 10 },
    { header: 'ที่หนังสือ', key: 'docNo', width: 20 },
    { header: 'จาก', key: 'from', width: 20 },
    { header: 'เรื่อง', key: 'subject', width: 30 },
    { header: 'การปฏิบัติ', key: 'action', width: 20 }
  ];

  data.forEach(item => worksheet.addRow(item));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=book_in_export.xlsx');
  workbook.xlsx.write(res).then(() => res.end());
});

module.exports = router;
