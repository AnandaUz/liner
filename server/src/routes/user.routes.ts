import { Router } from 'express';
import {getAllUsers, getUserById, updateSettings} from '../controllers/user.controller.js';


const router = Router();

// Когда кто-то зайдет на /api/users (POST), сработает создание
// router.post('/', createUser);

//
router.get('/', getAllUsers);

router.get('/:id', getUserById);

// Используем PUT для обновления
router.put('/:id/settings', updateSettings);

export default router;

