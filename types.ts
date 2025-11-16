export enum UserRole {
  Admin = 'admin',
  Teacher = 'teacher',
  Student = 'student',
}

export interface Student {
  id: string;
  name: string;
  idNumber: string; // Số báo danh for classroom context
}

export interface Classroom {
  id: string;
  name: string;
  students: Student[];
}

// NEW USER TYPES
export interface Admin {
  email: 'khanh92.toan@gmail.com';
  role: 'admin';
}

export interface Teacher {
  id: string;
  role: 'teacher';
  name: string;
  phone: string; // Tên đăng nhập
  password?: string; 
  activated: boolean;
  classrooms: Classroom[];
}

export interface StudentUser {
  id: string;
  role: 'student';
  name: string;
  phone: string; // Tên đăng nhập
  password?: string;
}

export type User = Admin | Teacher | StudentUser;


export interface VariationTableData {
  x: string[];
  yPrime: string[];
  y: string[];
}

export enum QuestionType {
  MCQ = 'mcq', // Multiple Choice Question
  TF = 'tf',   // True/False
  SA = 'sa',   // Short Answer
}

export interface TFStatement {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  questionText: string;
  type: QuestionType;
  points: number;
  image?: string; 

  // MCQ specific
  options?: string[];
  correctAnswer?: string;

  // True/False specific
  statements?: TFStatement[];
  correctAnswers?: boolean[];

  // SA specific (correct answer is for reference, not auto-grading)
  // We can add a field for suggested answer if needed later

  variationTableData?: VariationTableData; 
  graphFunction?: string; 
}

export interface AssignmentPart {
  id: string;
  title: string;
  questions: Question[];
}


export interface UploadedFile {
    name: string;
    type: string;
    content: string; // base64 content
}

export type Answer = string | boolean[] | undefined;
export type Answers = { [questionId: string]: Answer };

export interface Submission {
  studentName: string;
  studentIdNumber: string;
  answers: Answers;
  uploadedFile?: UploadedFile & { ocrText?: string };
  score: number;
  submittedAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  files: UploadedFile[];
  parts: AssignmentPart[];
  submissions: Submission[];
  classroomId: string; 
}

// For statistics
export interface ScoreDistribution {
    range: string;
    count: number;
}


// Curriculum types for Document Library
export interface Topic {
  id: string;
  name: string;
  subtopics?: Topic[];
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

export interface Grade {
  id:string;
  name: string;
  subjects: Subject[];
}

export type CurriculumData = Grade[];