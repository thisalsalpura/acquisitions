import bcryt from 'bcrypt';
import logger from "#config/logger.js";
import { users } from '#models/user.model.js';
import { db } from '#config/database.js';
import { eq } from 'drizzle-orm';

export const hashPassword = async (password) => {
    try {
        return await bcryt.hash(password, 10);
    } catch (error) {
        logger.error(`Invalid hashing the password: ${error}`);
        throw new Error('Error Hashing!');
    }
}

export const createUser = async ({ name, email, password, role = 'user' }) => {
    try {
        const existingUser = db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser.lenght > 0) throw new Error('User already Exists!');

        const password_hash = await hashPassword(password);

        const [newUser] = await db
            .insert(users)
            .values({ name, email, password, password_hash, role })
            .returning({ id: users.id, name: users.name, email: users.email, role: users.role, createUser: users.created_at });

        logger.info(`User ${newUser.email} created Successfully!`);
        return newUser;
    } catch (error) {
        logger.error(`Error creating the User: ${error}`);
    }
}