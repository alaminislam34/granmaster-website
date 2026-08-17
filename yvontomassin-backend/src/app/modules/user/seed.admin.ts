import bcrypt from 'bcrypt';
import { User } from './user.model';
import config from '../../config';

export async function seedAdmin() {
  try {
    const adminEmail = 'admin@gmail.com';
    const adminPassword = '123456';

    const existing = await User.findOne({ email: adminEmail }).select('+password');

    if (!existing) {
      // No admin yet — create fresh, let pre('save') hook hash the password
      await User.create({
        name: 'Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'user',
        is_admin: true,
        isVerified: true,
        status: 'active',
        needsPasswordChange: false,
        provider: 'email',
      });
      console.log('✅ Admin user seeded: admin@gmail.com / 123456');
    } else {
      // Admin exists — always re-hash and update password to fix any double-hash issue
      const freshHash = await bcrypt.hash(
        adminPassword,
        Number(config.bcrypt_salt_rounds),
      );
      await User.findOneAndUpdate(
        { email: adminEmail },
        {
          password: freshHash,
          is_admin: true,
          isVerified: true,
          status: 'active',
          needsPasswordChange: false,
        },
      );
      console.log('✅ Admin password reset & is_admin ensured');
    }
  } catch (err) {
    console.error('❌ Admin seed failed:', err);
  }
}
