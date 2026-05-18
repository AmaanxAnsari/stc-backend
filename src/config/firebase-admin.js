// import admin from 'firebase-admin';

// const serviceAccount = JSON.parse(
//   Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString(
//     'utf8',
//   ),
// );

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// export const messaging = admin.messaging();
// export default admin;

import admin from 'firebase-admin';

let messaging = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString(
      'utf8',
    ),
  );

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  messaging = admin.messaging();
} else {
  console.log('⚠️ Firebase disabled - no service account found');
}

export { messaging };
export default admin;