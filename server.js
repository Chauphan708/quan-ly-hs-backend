// --- Bước 1: Import các thư viện cần thiết ---
const express = require('express');
const cors = require('cors');

// --- Bước 2: Khởi tạo ứng dụng Express ---
const app = express();
const PORT = 3001; // Server sẽ chạy ở cổng này

// --- Bước 3: Cấu hình Middleware ---
app.use(cors());
app.use(express.json());

// --- HÀM TIỆN ÍCH ---
const generateAccessCode = (existingCodes) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let code;
  do {
    code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (existingCodes.includes(code));
  return code;
};

// --- DATABASE TẠM THỜI (Trong bộ nhớ) ---
// Dữ liệu này sẽ được thay thế bằng PostgreSQL trong tương lai
let db = {
  teachers: [{ id: 1, name: 'Cô Mai', username: 'gv.main', password: 'password123' }],
  classes: [{ id: 101, name: 'Lớp 1A', academicYear: '2024-2025', teacherId: 1 }],
  students: [
    { id: 1001, name: 'Nguyễn Văn An', dob: '2018-05-10', classId: 101, parentAccessCode: 'aK8!n#zPqR7@' },
    { id: 1002, name: 'Trần Thị Bình', dob: '2018-07-22', classId: 101, parentAccessCode: 'bL9@m$xOqS8#' },
  ],
  assessments: [
    { id: 1, studentId: 1001, type: 'regular', subject: 'Tiếng Việt', date: '2024-10-15', comment: 'Con đọc to, rõ ràng, có tiến bộ.' },
    { id: 2, studentId: 1001, type: 'periodic', subject: 'Toán', date: '2024-12-20', period: 'Cuối HK1', score: 9, comment: 'Con nắm vững kiến thức, làm bài cẩn thận.' },
    { id: 3, studentId: 1002, type: 'regular', subject: 'Mỹ thuật', date: '2024-10-16', comment: 'Con có óc sáng tạo, tô màu đẹp.' },
  ],
  commonComments: [
    'Em hoàn thành tốt bài tập.',
    'Em cần rèn chữ viết cẩn thận hơn.',
    'Tích cực phát biểu xây dựng bài.',
    'Cần hoàn thiện bài tập 3.',
    'Viết chữ dễ nhìn hơn.',
  ]
};

// --- API Endpoints ---

// == XÁC THỰC (AUTHENTICATION) ==
app.post('/api/auth/teacher', (req, res) => {
    const { username, password } = req.body;
    console.log(`[AUTH] Yêu cầu đăng nhập của giáo viên: ${username}`);
    const teacher = db.teachers.find(t => t.username === username && t.password === password);
    if (teacher) {
        res.json(teacher);
    } else {
        res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }
});

app.post('/api/auth/parent', (req, res) => {
    const { accessCode } = req.body;
    console.log(`[AUTH] Yêu cầu đăng nhập của phụ huynh với mã: ${accessCode}`);
    const student = db.students.find(s => s.parentAccessCode === accessCode);
    if (student) {
        res.json(student);
    } else {
        res.status(401).json({ message: 'Mã truy cập không hợp lệ.' });
    }
});

// == LỚP HỌC & HỌC SINH ==
app.get('/api/teachers/:teacherId/classes', (req, res) => {
    const teacherId = parseInt(req.params.teacherId);
    console.log(`[GET] Lấy danh sách lớp cho giáo viên ID: ${teacherId}`);
    const classes = db.classes.filter(c => c.teacherId === teacherId);
    res.json(classes);
});

app.get('/api/classes/:classId/students', (req, res) => {
  const classId = parseInt(req.params.classId);
  console.log(`[GET] Lấy danh sách học sinh cho lớp ID: ${classId}`);
  const studentsInClass = db.students.filter(s => s.classId === classId);
  res.json(studentsInClass);
});

app.post('/api/students', (req, res) => {
  const { name, dob, classId } = req.body;
  console.log(`[POST] Thêm học sinh mới: ${name} vào lớp ID: ${classId}`);
  if (!name || !dob || !classId) {
    return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });
  }
  const existingCodes = db.students.map(s => s.parentAccessCode);
  const newStudent = { id: Date.now(), name, dob, classId, parentAccessCode: generateAccessCode(existingCodes) };
  db.students.push(newStudent);
  res.status(201).json(newStudent);
});

app.post('/api/students/bulk', (req, res) => {
    const { students, classId } = req.body;
    console.log(`[POST] Thêm ${students.length} học sinh vào lớp ID: ${classId}`);
    if (!students || !Array.isArray(students) || !classId) {
        return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
    }
    let existingCodes = db.students.map(s => s.parentAccessCode);
    const newStudentsList = [];
    for (const student of students) {
        const newCode = generateAccessCode(existingCodes);
        const newStudent = { id: Date.now() + Math.random(), name: student.name, dob: student.dob, classId: classId, parentAccessCode: newCode };
        db.students.push(newStudent);
        newStudentsList.push(newStudent);
        existingCodes.push(newCode);
    }
    res.status(201).json(newStudentsList);
});

// == ĐÁNH GIÁ (ASSESSMENTS) ==
app.get('/api/students/:studentId/assessments', (req, res) => {
    const studentId = parseInt(req.params.studentId);
    console.log(`[GET] Lấy đánh giá cho học sinh ID: ${studentId}`);
    const assessments = db.assessments.filter(a => a.studentId === studentId);
    res.json(assessments);
});

app.post('/api/assessments', (req, res) => {
    const assessmentData = req.body;
    console.log(`[POST] Thêm đánh giá mới cho học sinh ID: ${assessmentData.studentId}`);
    const newAssessment = { ...assessmentData, id: Date.now() };
    db.assessments.push(newAssessment);
    res.status(201).json(newAssessment);
});

app.post('/api/assessments/bulk', (req, res) => {
    const { studentIds, assessmentTemplate } = req.body;
    console.log(`[POST] Thêm đánh giá đồng loạt cho ${studentIds.length} học sinh.`);
    const newAssessments = [];
    studentIds.forEach(studentId => {
        const newAssessment = { ...assessmentTemplate, studentId, id: Date.now() + Math.random() };
        db.assessments.push(newAssessment);
        newAssessments.push(newAssessment);
    });
    res.status(201).json(newAssessments);
});

// == NHẬN XÉT NHANH (COMMON COMMENTS) ==
app.get('/api/common-comments', (req, res) => {
    console.log(`[GET] Lấy danh sách nhận xét nhanh.`);
    res.json(db.commonComments);
});

app.post('/api/common-comments', (req, res) => {
    const { comment } = req.body;
    console.log(`[POST] Thêm nhận xét nhanh mới: "${comment}"`);
    if (comment && !db.commonComments.includes(comment)) {
        db.commonComments.push(comment);
    }
    res.status(201).json(db.commonComments);
});

// --- Khởi động Server ---
app.listen(PORT, () => {
  console.log(`Backend server đang chạy tại http://localhost:${PORT}`);
});
