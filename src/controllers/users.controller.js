import logger from '#config/logger.js';
import {
  getAllUsers,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from '#services/users.service.js';
import { formatValidationErrors } from '#utils/format.js';
import {
  updateUserSchema,
  userIdSchema,
} from '#validations/users.validation.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Getting Users...');
    const allUsers = await getAllUsers();
    res.json({
      message: 'Successfully retrived Users!',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

export const fetchUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      logger.warn(
        'Validation Error in getUserById Controller:',
        formatValidationErrors(validationResult.error)
      );
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting User with id: ${id}`);
    const user = await getUserByIdService(id);

    if (!user) {
      logger.warn(`User not found with id: ${id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'Successfully retrived User!',
      user,
    });
  } catch (error) {
    logger.error('Error in getUserById Controller:', error);
    next(error);
  }
};

export const updateUserById = async (req, res, next) => {
  try {
    const idValidationResult = userIdSchema.safeParse(req.params);

    if (!idValidationResult.success) {
      logger.warn(
        'Validation Error in updateUser Controller (params):',
        formatValidationErrors(idValidationResult.error)
      );
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(idValidationResult.error),
      });
    }

    const bodyValidationResult = updateUserSchema.safeParse(req.body);

    if (!bodyValidationResult.success) {
      logger.warn(
        'Validation Error in updateUser Controller (body):',
        formatValidationErrors(bodyValidationResult.error)
      );
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(bodyValidationResult.error),
      });
    }

    const { id } = idValidationResult.data;
    const updates = bodyValidationResult.data;

    if (!req.user) {
      logger.warn('Unauthorized update attempt: no authenticated user');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to update user information.',
      });
    }

    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    if (requesterRole !== 'admin' && requesterId !== id) {
      logger.warn(
        `Forbidden update attempt by user ${requesterId} on user ${id}`
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own account.',
      });
    }

    if (updates.role && requesterRole !== 'admin') {
      logger.warn(
        `Non-admin user ${requesterId} attempted to change role for user ${id}`
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admin users can change roles.',
      });
    }

    const updatedUser = await updateUserService(id, updates);

    res.status(200).json({
      message: 'User updated Successfully!',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Error in updateUser Controller:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(error);
  }
};

export const deleteUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      logger.warn(
        'Validation Error in deleteUser Controller:',
        formatValidationErrors(validationResult.error)
      );
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    if (!req.user) {
      logger.warn('Unauthorized delete attempt: no authenticated user');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to delete user.',
      });
    }

    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    if (requesterRole !== 'admin' && requesterId !== id) {
      logger.warn(
        `Forbidden delete attempt by user ${requesterId} on user ${id}`
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own account.',
      });
    }

    const deletedUser = await deleteUserService(id);

    res.status(200).json({
      message: 'User deleted Successfully!',
      user: deletedUser,
    });
  } catch (error) {
    logger.error('Error in deleteUser Controller:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(error);
  }
};
