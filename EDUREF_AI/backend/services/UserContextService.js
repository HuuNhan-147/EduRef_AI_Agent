import prisma from '../config/prisma.js';
import { getStudentFullProfile } from '../config/studentRegistry.js';

export async function loadUserContext(actor, requestedStudentCode = null) {
  const isStudent = actor?.role === 'STUDENT';
  const code = isStudent ? actor.studentCode : requestedStudentCode;
  if (!isStudent && !code) {
    const user = await prisma.user.findUnique({ where: { id: actor.id } });
    return user ? { username: user.username, fullName: user.fullName, email: user.email,
      role: user.role, type: 'STAFF' } : {};
  }
  if (!code) return {};
  const student = await prisma.student.findUnique({ where: { studentCode: String(code).trim() }, include: { department: true } });
  if (!student) return {};
  return { ...getStudentFullProfile(student.studentCode, student), email: student.email,
    department: student.department?.name, tuitionDebt: Number(student.tuitionDebt), gpa: Number(student.gpa),
    role: 'STUDENT', type: 'STUDENT' };
}
