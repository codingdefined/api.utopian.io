import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import userCtrl from '../controllers/user.controller';

const router = express.Router(); // eslint-disable-line new-cap

router.route('/')
  /** GET /api/users - Get list of users */
  .get(userCtrl.list)
  .post(validate(paramValidation.createUser), userCtrl.create);

router.route('/:userId')
  .get(userCtrl.get)
  .put(validate(paramValidation.updateUser), userCtrl.update)
  .delete(userCtrl.remove);

router.route('/:userId/projects')
  .get(userCtrl.getProjects);

router.route('/:userId/platforms/:platform')
  .get(userCtrl.get)


router.param('userId', userCtrl.load);

export default router;
