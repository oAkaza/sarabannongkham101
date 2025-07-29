const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// 📁 Path ไปยัง JSON
const dataPath = path.join(__dirname, '../data/note_data.json');

// 📦 ตั้งค่าการอัปโหลด PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 📒 GET หน้าแบบฟอร์มบันทึก
router.get('/', (req, res) => {
  res.render('note_form');
});

// 💾 POST บันทึกข้อมูลแบบ AJAX
router.post('/', upload.single('pdfFile'), (req, res) => {
  const notes = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];

  // เช็คเลขที่ซ้ำ
  const exists = notes.find(n => n.registerNo === req.body.registerNo);
  if (exists) {
    return res.json({ success: false, message: 'เลขที่บันทึกนี้มีอยู่แล้วในระบบ!' });
  }

  const newNote = {
    registerNo: req.body.registerNo,
    noteDate: req.body.noteDate,
    from: req.body.from,
    to: req.body.to,
    subject: req.body.subject,
    pdfFile: req.file ? req.file.filename : null
  };

  notes.push(newNote);
  fs.writeFileSync(dataPath, JSON.stringify(notes, null, 2));
  res.json({ success: true, message: 'บันทึกข้อมูลสำเร็จแล้ว!' });
});



// 📋 GET รายการบันทึกทั้งหมด (Export Excel)
router.get('/export', async (req, res) => {
  const notes = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];

  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Notes');

  worksheet.columns = [
    { header: 'เลขที่บันทึก', key: 'registerNo', width: 20 },
    { header: 'วันที่บันทึก', key: 'noteDate', width: 15 },
    { header: 'จาก', key: 'from', width: 20 },
    { header: 'ถึง', key: 'to', width: 20 },
    { header: 'เรื่อง', key: 'subject', width: 30 }
  ];

  notes.forEach(note => {
    worksheet.addRow({
      registerNo: note.registerNo || '',
      noteDate: note.noteDate || '',
      from: note.from || '',
      to: note.to || '',
      subject: note.subject || ''
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=note_export.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}); // ✅ ตรงนี้คือจุดจบของ route '/note/export'

// ✏️ GET แก้ไขบันทึก
router.get('/edit/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const notes = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];

  if (isNaN(id) || id < 0 || id >= notes.length) {
    return res.status(404).send('ไม่พบข้อมูลที่ต้องการแก้ไข');
  }

  res.render('note_edit_form', { note: notes[id], index: id });
});

// 💾 POST แก้ไขบันทึก
router.post('/edit/:id', upload.single('pdfFile'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  let notes = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];

  if (isNaN(id) || id < 0 || id >= notes.length) {
    return res.status(400).send('ไม่สามารถแก้ไขรายการนี้ได้');
  }

  notes[id] = {
    ...notes[id],
    registerNo: req.body.registerNo,
    noteDate: req.body.noteDate,
    from: req.body.from,
    to: req.body.to,
    subject: req.body.subject,
    pdfFile: req.file ? req.file.filename : notes[id].pdfFile
  };

  fs.writeFileSync(dataPath, JSON.stringify(notes, null, 2));
  res.redirect('/note/list');
});

// 📋 แสดงรายการบันทึกทั้งหมด
router.get('/list', (req, res) => {
  const notes = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath))
    : [];
  res.render('note_list', { data: notes });
});

// 📦 POST ลบข้อมูล
router.post('/delete/:index', (req, res) => {
  if (!fs.existsSync(dataPath)) return res.redirect('/note/list');

  const notes = JSON.parse(fs.readFileSync(dataPath));
  const index = parseInt(req.params.index);

  if (!isNaN(index) && index >= 0 && index < notes.length) {
    // ถ้ามีไฟล์แนบ ให้ลบไฟล์ด้วย
    const pdfPath = path.join(__dirname, '../uploads', notes[index].pdfFile || '');
    if (notes[index].pdfFile && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }

    notes.splice(index, 1);
    fs.writeFileSync(dataPath, JSON.stringify(notes, null, 2));
  }

  res.redirect('/note/list');
});

router.get('/preview/:file', (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(__dirname, '../uploads', fileName);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('ไม่พบไฟล์ PDF ที่ร้องขอ');
  }
});


module.exports = router;
