import logger from '#config/logger.js';
import { authenticateUser, createUser } from '#services/auth.service.js';
import { formatValidationErrors } from '#utils/format.js';
import { signInSchema, signUpSchema } from '#validations/auth.validation.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const signup = async (req, res, next) => {
  try {
    const validationResult = signUpSchema.safeParse(req.body);

    if (!validationResult.success) {
      logger.warn(
        'Validation Error in SignUp Controller:',
        formatValidationErrors(validationResult.error)
      );
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(validationResult.error),
      });
    }

    const { name, email, password, role } = validationResult.data;

    const user = await createUser({ name, email, password, role });

    const token = jwttoken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'token', token);

    logger.info(`User registered Successfully: ${email}`);
    res.status(201).json({
      message: 'User registered Successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error in signup Controller:', error);

    if (error.message === 'User with this email already Exists!') {
      return res.status(409).json({ error: 'Email already Exists!' });
    }

    next(error);
  }
};

export const signin = async (req, res, next) => {
  try {
    const validationResult = signInSchema.safeParse(req.body);

    if (!validationResult.success) {
      logger.warn(
        'Validation Error in SignIn Controller:',
        formatValidationErrors(validationResult.error)
      );
      return res.status(400).json({
        error: 'Validation Failed',
        details: formatValidationErrors(validationResult.error),
      });
    }

    const { email, password } = validationResult.data;

    const user = await authenticateUser({ email, password });

    const token = jwttoken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'token', token);

    logger.info(`User signed in Successfully: ${email}`);
    res.status(200).json({
      message: 'User signed in Successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error in signin Controller:', error);

    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    const token = cookies.get(req, 'token');

    if (token) {
      logger.info('User signout requested with existing token.');
    } else {
      logger.info('User signout requested without existing token.');
    }

    cookies.clear(res, 'token');

    logger.info('User signed out Successfully');
    res.status(200).json({ message: 'User signed out Successfully!' });
  } catch (error) {
    logger.error('Error in signout Controller:', error);
    next(error);
  }
};
