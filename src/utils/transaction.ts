import mongoose, { ClientSession } from 'mongoose';

/**
 * Run a callback inside a Mongoose transaction.
 * Any exception thrown inside cb() will abort the transaction and re-throw.
 */
export async function withTransaction<T>(
  cb: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await cb(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
