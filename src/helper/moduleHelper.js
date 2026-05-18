import  AdminUser from '../models/admin/adminUser.js';
import Module from '../models/admin/moduleModel.js';
import Role from '../models/admin/roleModel.js';


/**
 * Syncs module changes across non-admin users.
 */
export const syncModuleToUsers = async (
  action,
  moduleName,
  newModuleName = null,
) => {
  try {
    // Get the Admin role ID (assuming it's named 'Admin')
    const adminRole = await Role.findOne({ name: 'Admin' });
    console.log('adminRole', adminRole);

    // Get all users except admins
    const users = await AdminUser.find({
      role_id: { $ne: adminRole?._id },
      is_deleted: { $ne: true },
    });

    console.log('Users', users);

    for (const user of users) {
      let updated = false;

      switch (action) {
        case 'add':
          // Only add if not already exists
          const exists = user.permissions.find(
            (p) => p.module_name === moduleName,
          );
          if (!exists) {
            user.permissions.push({
              module_name: moduleName,
              create: false,
              read: false,
              update: false,
              delete: false,
            });
            updated = true;
          }
          break;

        case 'rename':
          // Rename the module in permissions
          user.permissions = user.permissions.map((p) => {
            if (p.module_name === moduleName) {
              p.module_name = newModuleName;
              updated = true;
            }
            return p;
          });
          break;

        case 'delete':
          // Remove the module from permissions
          const originalLength = user.permissions.length;
          user.permissions = user.permissions.filter(
            (p) => p.module_name !== moduleName,
          );
          if (user.permissions.length !== originalLength) updated = true;
          break;
      }

      if (updated) await user.save();
    }

    console.log(`✅ Synced "${action}" for module "${moduleName}"`);
  } catch (err) {
    console.error(`❌ Error syncing module to users:`, err.message);
  }
};

export const syncAllModulesToUsers = async () => {
  try {
    const allModules = await Module.find({});
    const moduleNames = allModules.map((m) => m.name);

    const adminRole = await Role.findOne({ name: 'Admin' });

    const users = await AdminUser.find({
      role_id: { $ne: adminRole?._id },
      is_deleted: { $ne: true },
    });

    for (const user of users) {
      const userModuleNames = user.permissions.map((p) => p.module_name);
      let updated = false;

      moduleNames.forEach((mod) => {
        if (!userModuleNames.includes(mod)) {
          user.permissions.push({
            module_name: mod,
            create: false,
            read: false,
            update: false,
            delete: false,
          });
          updated = true;
        }
      });

      if (updated) {
        await user.save();
        console.log(`✅ Synced modules for user: ${user.name}`);
      }
    }

    console.log(`✨ All users now have latest modules`);
  } catch (error) {
    console.error('❌ Error syncing modules to users:', error.message);
  }
};
