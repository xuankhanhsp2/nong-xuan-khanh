
import React, { useState, useCallback, useEffect } from 'react';
import { Assignment, Submission, Teacher, Question, QuestionType, Answers, User, StudentUser, Admin } from './types';
import TeacherDashboard from './components/TeacherDashboard';
import StudentView from './components/StudentView';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';

const ADMIN_USER: Admin = { email: 'khanh92.toan@gmail.com', role: 'admin' };
const ADMIN_PASS = 'khanh123@';

interface AllUsers {
  teachers: Teacher[];
  students: StudentUser[];
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<AllUsers>({ teachers: [], students: [] });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [initialAssignmentId, setInitialAssignmentId] = useState<string | null>(null);
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentIdFromUrl = urlParams.get('assignmentId');
    if (assignmentIdFromUrl) {
      setInitialAssignmentId(assignmentIdFromUrl.toUpperCase());
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  const handleRegister = (details: { name: string; phone: string; pass: string; role: 'teacher' | 'student' }) => {
    const phoneExists = allUsers.teachers.some(t => t.phone === details.phone) || allUsers.students.some(s => s.phone === details.phone);
    if (phoneExists) {
        alert('Số điện thoại đã được đăng ký. Vui lòng sử dụng số khác.');
        return;
    }

    if (details.role === 'teacher') {
        const newTeacher: Teacher = {
            id: `TEA-${Date.now()}`,
            role: 'teacher',
            name: details.name,
            phone: details.phone,
            password: details.pass,
            activated: false,
            classrooms: [],
        };
        setAllUsers(prev => ({...prev, teachers: [...prev.teachers, newTeacher]}));
        alert('Đăng ký tài khoản giáo viên thành công! Vui lòng chờ Admin kích hoạt.');
    } else {
        const newStudent: StudentUser = {
            id: `STU-${Date.now()}`,
            role: 'student',
            name: details.name,
            phone: details.phone,
            password: details.pass,
        };
        setAllUsers(prev => ({...prev, students: [...prev.students, newStudent]}));
        alert('Đăng ký tài khoản học sinh thành công! Bạn có thể đăng nhập ngay.');
    }
  };

  const handleLogin = (creds: { user: string; pass: string; }) => {
    // Admin login
    if (creds.user === ADMIN_USER.email && creds.pass === ADMIN_PASS) {
        setCurrentUser(ADMIN_USER);
        return;
    }
    // Teacher login
    const teacher = allUsers.teachers.find(t => t.phone === creds.user && t.password === creds.pass);
    if (teacher) {
        setCurrentUser(teacher);
        return;
    }
    // Student login
    const student = allUsers.students.find(s => s.phone === creds.user && s.password === creds.pass);
    if (student) {
        setCurrentUser(student);
        return;
    }
    alert('Tên đăng nhập hoặc mật khẩu không đúng.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAssignments([]);
    setActiveAssignment(null);
    setActiveClassroomId(null);
  };
  
  const handleActivateTeacher = (teacherId: string) => {
    setAllUsers(prev => ({
        ...prev,
        teachers: prev.teachers.map(t => t.id === teacherId ? {...t, activated: true} : t),
    }));
  };

  const handleCreateAssignment = useCallback((newAssignment: Omit<Assignment, 'id' | 'submissions'>, classroomId: string) => {
    const assignmentWithId: Assignment = {
      ...newAssignment,
      id: `ASMT-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      submissions: [],
      classroomId: classroomId,
    };
    setAssignments(prev => [...prev, assignmentWithId]);
    return assignmentWithId;
  }, []);

  const handleStartAssignment = (assignmentId: string, studentName: string, studentIdNumber: string) => {
    const assignment = assignments.find(a => a.id.toUpperCase() === assignmentId.toUpperCase());
     if (assignment) {
        // Since teachers are now logged in, we need to find the teacher who owns the assignment
        const ownerTeacher = allUsers.teachers.find(t => t.classrooms.some(c => c.id === assignment.classroomId));
        const classroom = ownerTeacher?.classrooms.find(c => c.id === assignment.classroomId);

        if (classroom) {
            const student = classroom.students.find(s => s.name.toLowerCase().trim() === studentName.toLowerCase().trim() && s.idNumber === studentIdNumber);
            if (student) {
                setActiveAssignment(assignment);
            } else {
                alert('Tên hoặc số báo danh không đúng. Vui lòng kiểm tra lại.');
            }
        } else {
            alert('Không tìm thấy lớp học cho bài tập này.');
        }
    } else {
      alert('Mã bài tập không hợp lệ!');
    }
  };
  
  const calculateScore = (questions: Question[], answers: Answers): number => {
    let score = 0;
    for (const question of questions) {
      const studentAnswer = answers[question.id];
      if (studentAnswer === undefined) continue;

      switch (question.type) {
        case QuestionType.MCQ:
          if (studentAnswer === question.correctAnswer) {
            score += question.points;
          }
          break;
        case QuestionType.TF:
          if (Array.isArray(studentAnswer) && Array.isArray(question.correctAnswers)) {
            const correctCount = studentAnswer.reduce((count, answer, index) => {
              return count + (answer === question.correctAnswers?.[index] ? 1 : 0);
            }, 0);

            if (correctCount === 4) score += question.points;
            else if (correctCount === 3) score += 0.5;
            else if (correctCount === 2) score += 0.25;
            else if (correctCount === 1) score += 0.1;
          }
          break;
        case QuestionType.SA:
          break; // Not auto-graded
      }
    }
    return parseFloat(score.toFixed(2));
  };


  const handleSubmitAssignment = (submission: Omit<Submission, 'score' | 'submittedAt'>) => {
    if (!activeAssignment) return;
    const allQuestions = activeAssignment.parts.flatMap(p => p.questions);
    const finalScore = calculateScore(allQuestions, submission.answers);

    const finalSubmission: Submission = { ...submission, score: finalScore, submittedAt: new Date().toISOString() };
    const updatedAssignment = { ...activeAssignment, submissions: [...activeAssignment.submissions, finalSubmission] };
    
    setActiveAssignment(updatedAssignment);
    setAssignments(prev => prev.map(a => a.id === updatedAssignment.id ? updatedAssignment : a));
  };
  
  const handleViewAsStudent = (assignment: Assignment) => setActiveAssignment(assignment);
  
  const handleExitStudentView = () => setActiveAssignment(null);

  const handleCreateClassroom = (classroomName: string) => {
    if (!currentUser || currentUser.role !== 'teacher') return;
    const newClassroom = { id: `CL-${Date.now()}`, name: classroomName, students: [] };
    
    const updatedUser = { ...currentUser, classrooms: [...currentUser.classrooms, newClassroom] };
    setCurrentUser(updatedUser);
    setAllUsers(prev => ({...prev, teachers: prev.teachers.map(t => t.id === currentUser.id ? updatedUser : t)}));
    setActiveClassroomId(newClassroom.id);
  };

  const handleAddStudentsToClassroom = (classroomId: string, studentNames: string[]) => {
     if (!currentUser || currentUser.role !== 'teacher') return;
     const updatedClassrooms = currentUser.classrooms.map(c => {
       if (c.id === classroomId) {
         let currentMaxId = c.students.length;
         const newStudents = studentNames.map(name => ({
           id: `STU-CLS-${Date.now()}-${++currentMaxId}`,
           name: name,
           idNumber: `${currentMaxId}`.padStart(3, '0'),
         }));
         return { ...c, students: [...c.students, ...newStudents] };
       }
       return c;
     });
     const updatedUser = { ...currentUser, classrooms: updatedClassrooms };
     setCurrentUser(updatedUser);
     setAllUsers(prev => ({...prev, teachers: prev.teachers.map(t => t.id === currentUser.id ? updatedUser : t)}));
  };
  
  const handleExportData = () => {
    const dataToExport = {
      users: allUsers,
      assignments: assignments,
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini_classroom_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("Dữ liệu đã được xuất thành công!");
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);
        if (parsedData.users && parsedData.assignments) {
            setAllUsers(parsedData.users);
            setAssignments(parsedData.assignments);
            alert("Dữ liệu đã được nhập thành công! Vui lòng đăng nhập lại.");
            handleLogout();
        } else {
          throw new Error("Cấu trúc tệp JSON không đúng.");
        }
      } catch (error) {
        alert(`Đã xảy ra lỗi khi nhập dữ liệu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
      }
    };
    reader.readAsText(file);
  };

  const renderContent = () => {
    if (activeAssignment && (!currentUser || currentUser.role !== 'teacher')) { 
      return <StudentView assignment={activeAssignment} onSubmit={handleSubmitAssignment} onExit={() => setActiveAssignment(null)} isTeacherPreview={false} />;
    }
    
    if (currentUser) {
        switch(currentUser.role) {
            case 'admin':
                return <AdminDashboard teachers={allUsers.teachers} onActivateTeacher={handleActivateTeacher} onLogout={handleLogout} />;
            
            case 'teacher':
                if (!currentUser.activated) {
                    return (
                        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                            <h2 className="text-2xl font-bold mb-4">Tài khoản của bạn đang chờ phê duyệt</h2>
                            <p className="text-gray-600 mb-6">Vui lòng liên hệ với quản trị viên để kích hoạt tài khoản.</p>
                            <button onClick={handleLogout} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg">Đăng xuất</button>
                        </div>
                    );
                }
                if (activeAssignment) { 
                    return <StudentView assignment={activeAssignment} onSubmit={()=>{}} onExit={handleExitStudentView} isTeacherPreview={true} />;
                }
                return (
                    <TeacherDashboard
                        teacher={currentUser}
                        assignments={assignments}
                        onCreateAssignment={handleCreateAssignment}
                        onViewAsStudent={handleViewAsStudent}
                        onLogout={handleLogout}
                        onCreateClassroom={handleCreateClassroom}
                        onAddStudents={handleAddStudentsToClassroom}
                        activeClassroomId={activeClassroomId}
                        setActiveClassroomId={setActiveClassroomId}
                        onExport={handleExportData}
                        onImport={handleImportData}
                    />
                );

            case 'student':
                 return <StudentDashboard 
                            student={currentUser} 
                            onLogout={handleLogout} 
                            onStartAssignment={handleStartAssignment}
                        />;
        }
    }

    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onStartAssignment={handleStartAssignment} initialAssignmentId={initialAssignmentId} />;
  };

  return (
    <div className="min-h-screen text-slate-800">
      <main>{renderContent()}</main>
    </div>
  );
};

export default App;
