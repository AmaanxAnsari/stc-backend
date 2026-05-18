// import authMiddleware from "./auth.js"; 

// export const hasPermission = (moduleName) => {
//   return (req, res, next) => {
//     authMiddleware(req, res, () => {
//       try {
//         const user = req.user;
//         if (!user || !user.permissions) {
//           return res.status(403).json({ success: false, message: 'Access denied: No permission data' });
//         }

//         const methodActionMap = {
//           GET: 'read',
//           POST: 'create',
//           PUT: 'update',
//           PATCH: 'update',
//           DELETE: 'delete'
//         };

//         const action = methodActionMap[req.method];
//         const modulePermission = user.permissions.find(
//           (perm) => perm.module_name === moduleName || perm.module_name === "*"
//         );

//         if (!modulePermission || !modulePermission[action]) {
//           return res.status(403).json({
//             success: false,
//             message: `Access denied: '${action}' permission required for '${moduleName}'`
//           });
//         }

//         next();
//       } catch (error) {
//         console.error('Permission check error:', error);
//         res.status(500).json({ success: false, message: 'Server error during permission check' });
//       }
//     });
//   };
// };


import authMiddleware from "./auth.js";

export const hasPermission = (moduleName) => {
  return (req, res, next) => {
    authMiddleware(req, res, () => {
      try {
        const user = req.user;
        if (!user || !user.permissions) {
          return res.status(403).json({ success: false, message: 'Access denied: No permission data' });
        }

        const methodActionMap = {
          GET: 'read',
          POST: 'create',
          PUT: 'update',
          PATCH: 'update',
          DELETE: 'delete'
        };

        const action = methodActionMap[req.method];

        const modulePermission = user.permissions.find((perm) => {
          return (
            perm.module_name === '*' || 
            moduleName === perm.module_name 
            // moduleName.startsWith(`${perm.module_name}/`) 
          );
        });

        if (!modulePermission || !modulePermission[action]) {
          return res.status(403).json({
            success: false,
            message: `Access denied: '${action}' permission required for '${moduleName}'`
          });
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ success: false, message: 'Server error during permission check' });
      }
    });
  };
};
