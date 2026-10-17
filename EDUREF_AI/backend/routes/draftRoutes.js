import express from 'express';
import Drafts from '../services/PetitionDraftService.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { respondServerError } from '../services/ErrorShield.js';
import { loadUserContext } from '../services/UserContextService.js';
import { HUTECH_FORMS } from '../services/StudentConfirmationDecisionService.js';
import { PETITION_FIELDS } from '../services/PetitionFields.js';
const router = express.Router();
router.use(authenticateToken);
router.use((req, res, next) => req.user?.role === 'STUDENT' && req.user.studentCode
  ? next() : res.status(403).json({ success: false, message: 'Hãy mở phiên sinh viên để chuẩn bị hồ sơ.' }));
function handle(operation) {
  return async (req, res) => {
    try { res.json({ success: true, data: await operation(req) }); }
    catch (error) {
      if (error.status) return res.status(error.status).json({ success: false, message: error.message });
      respondServerError(req, res, error);
    }
  };
}
router.get('/active', handle(req => Drafts.latest(req.user.studentCode)));
router.get('/config', handle(async req => ({ profile: await loadUserContext(req.user), forms: HUTECH_FORMS, fields: PETITION_FIELDS })));
router.post('/', handle(req => Drafts.prepare({ studentCode: req.user.studentCode,
  formCode: req.body.formCode, inputData: req.body.inputData })));
router.post('/from-request', handle(req => Drafts.fromRequest(req.user.studentCode, req.body.requestId)));
router.post('/:id/actions', handle(req => Drafts.action({ studentCode: req.user.studentCode,
  draftId: req.params.id, revision: req.body.revision, action: req.body.action,
  inputData: req.body.inputData, acknowledgeAddress: req.body.acknowledgeAddress })));
export default router;
