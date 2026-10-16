import express from 'express';
import { authenticateToken, requireStaffOrDean, requireRoles } from '../middlewares/authMiddleware.js';
import { rateLimit } from '../middlewares/rateLimit.js';
import { respondServerError } from '../services/ErrorShield.js';
import Sprint2Service from '../services/Sprint2Service.js';

const router = express.Router();
router.use(authenticateToken, requireStaffOrDean);
router.use((req, res, next) => {
  if (['POST', 'PATCH'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ success: false, message: 'Body cần là JSON object.' });
  }
  return next();
});
const mutationLimit = rateLimit({ name: 'sprint2-write', max: 20, windowMs: 60_000 });
const replayLimit = rateLimit({ name: 'sprint2-replay', max: 4, windowMs: 60_000 });
const handle = (operation) => async (req, res) => {
  try { res.json({ success: true, data: await operation(req) }); }
  catch (error) {
    if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
    return respondServerError(req, res, error);
  }
};
router.get('/overview', handle(() => Sprint2Service.overview()));
router.post('/feedback', mutationLimit, handle((req) => Sprint2Service.feedback(req.body, req.user)));
router.post('/policies/propose', mutationLimit, handle((req) => Sprint2Service.propose(req.body, req.user)));
router.post('/policies/:id/activate', requireRoles('DEAN', 'ADMIN'), mutationLimit, handle((req) => Sprint2Service.activate(req.params.id, req.body, req.user)));
router.post('/datasets', mutationLimit, handle((req) => Sprint2Service.createDataset(req.body, req.user)));
router.patch('/datasets/:id', mutationLimit, handle((req) => Sprint2Service.reviseDataset(req.params.id, req.body, req.user)));
router.post('/datasets/:id/freeze', requireRoles('DEAN', 'ADMIN'), mutationLimit, handle((req) => Sprint2Service.freezeDataset(req.params.id, req.body, req.user)));
router.post('/datasets/:id/compare', replayLimit, handle((req) => Sprint2Service.compare(req.params.id, req.body.candidatePolicyId, req.user)));
export default router;
