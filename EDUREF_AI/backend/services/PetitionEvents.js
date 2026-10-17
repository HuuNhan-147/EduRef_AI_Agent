import prisma from '../config/prisma.js';
let io = null;
export function setPetitionIO(instance) { io = instance; }
export async function publishPetitionStatus(requestId) {
  if (!io || !requestId) return;
  // Called only after the outer workflow transaction has committed.
  try {
    const request = await prisma.studentRequest.findUnique({ where: { id: requestId }, include: { student: true } });
    if (!request) return;
    const event = { requestId: request.id, requestCode: request.requestCode, status: request.status };
    const rooms = io.to(`user:${request.student.studentCode}`).to('staff');
    rooms.emit('petition_status_updated', event);
    if (request.status === 'ESCALATED') rooms.emit('petition_escalated', event);
  } catch (error) { console.warn('[PetitionEvents] Notification deferred; clients resync on reconnect.', error.code || error.name); }
}
