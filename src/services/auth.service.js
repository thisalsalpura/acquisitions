import bcrypt from 'bcrypt';
import logger from "#config/logger.js";
import { users } from '#models/user.model.js';
import { db } from '#config/database.js';
import { eq } from 'drizzle-orm';

export const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        logger.error(`Invalid hashing the password: ${error}`);
        throw new Error('Error Hashing!');
    }
};

export const comparePassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        logger.error(`Error comparing the password: ${error}`);
        throw new Error('Error Comparing Password!');
    }
};

export const createUser = async ({ name, email, password, role = 'user' }) => {
    try {
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser.length > 0) throw new Error('User with this email already Exists!');

        const passwordHash = await hashPassword(password);

        const [newUser] = await db
            .insert(users)
            .values({ name, email, password: passwordHash, role })
            .returning({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.created_at });

        logger.info(`User ${newUser.email} created Successfully!`);
        return newUser;
    } catch (error) {
        logger.error(`Error creating the User: ${error}`);
        throw error;
    }
};

export const authenticateUser = async ({ email, password }) => {
    try {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (!user) {
            logger.warn(`Authentication failed: user not found for email ${email}`);
            throw new Error('Invalid email or password');
        }

        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            logger.warn(`Authentication failed: invalid password for email ${email}`);
            throw new Error('Invalid email or password');
        }

        logger.info(`User ${user.email} authenticated Successfully!`);

        const { password: _password, ...safeUser } = user;
        return safeUser;
    } catch (error) {
        logger.error(`Error authenticating the User: ${error}`);
        throw error;
    }
};
