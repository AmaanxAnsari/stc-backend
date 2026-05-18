import axios from 'axios';
import FaceTec from '../../models/admin/faceTecModel.js';
import { User } from './../../models/app/user.js';

// Configuration
const FACETEC_BASE_URL = 'https://api.facetec.com/api/v4/biometrics';
const FACETEC_DEVICE_KEY = 'diF4GDHG2R8FAwMZ2SFzHM7QvaidLDUj';

// ---------------------------------------------------------
// 1. STATUS CHECK (Called immediately after Login)
// ---------------------------------------------------------
export const checkFaceStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("UserId",userId)

    // Check if user is already blocked
    const user = await User.findById(userId);
    if (!user.isActive) {
      return res.json({
        action: 'BLOCKED',
        message: 'Account is locked due to failed verifications.',
      });
    }

    let faceRecord = await FaceTec.findOne({ userId });

    // Scenario A: User verified recently (less than 3 days ago)
    // We check this FIRST to save processing
    if (
      faceRecord &&
      faceRecord.isEnrolled &&
      faceRecord.lastVerificationDate
    ) {
      const daysSince =
        (Date.now() - new Date(faceRecord.lastVerificationDate)) /
        (1000 * 3600 * 24);
      if (daysSince < 3) {
        return res.json({ action: 'ALLOW_ACCESS' });
      }
    }

    // Scenario B: Never Enrolled (1st Time)
    if (!faceRecord || !faceRecord.isEnrolled) {
      return res.json({
        action: 'ENROLL_FACE',
        message: 'Please setup Face Verification.',
      });
    }

    // Scenario C: Enrolled, but 3+ days have passed
    return res.json({
      action: 'VERIFY_FACE',
      message: 'Routine security check required.',
    });
  } catch (error) {
    console.error('Check Status Error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const enrollFace = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionRequestBlob, ftUserAgentString, externalDatabaseRefID } =
      req.body;

    if (!sessionRequestBlob || !ftUserAgentString) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing FaceTec payload' });
    }

    // 1) Call FaceTec /process-request to get responseBlob
    const ftPayload = {
      requestBlob: sessionRequestBlob,
      externalDatabaseRefID: externalDatabaseRefID || userId.toString(),
    };

    const ftRes = await axios.post(
      `https://api.facetec.com/api/v4/biometrics/process-request`,
      ftPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': FACETEC_DEVICE_KEY,
          'X-Testing-API-Header': ftUserAgentString,
        },
        timeout: 20000,
      },
    );

    const responseBlob = ftRes.data?.responseBlob;
    if (!responseBlob) {
      return res
        .status(500)
        .json({
          success: false,
          message: 'FaceTec did not return responseBlob',
        });
    }

    // 2) Update DB (your logic)
    await FaceTec.findOneAndUpdate(
      { userId },
      {
        $set: {
          isEnrolled: true,
          enrollmentDate: new Date(),
          lastVerificationDate: new Date(),
          lastVerificationStatus: 'PASS',
          consecutiveFailures: 0,
        },
        $push: {
          auditTrail: {
            action: 'ENROLL',
            status: 'PASS',
            sessionId: externalDatabaseRefID || '',
          },
        },
      },
      { upsert: true },
    );

    // 3) Return responseBlob so device SDK can finish session
    return res.json({ success: true, action: 'ALLOW_ACCESS', responseBlob });
  } catch (e) {
    console.error('Enroll Error:', e?.response?.data || e.message);
    return res
      .status(500)
      .json({ success: false, message: 'Enrollment failed' });
  }
};


export const verifyFace = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionRequestBlob, ftUserAgentString, externalDatabaseRefID } =
      req.body;

    if (!sessionRequestBlob || !ftUserAgentString) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing FaceTec payload' });
    }

    // 1) Call FaceTec /process-request to get responseBlob
    const ftPayload = {
      requestBlob: sessionRequestBlob,
      externalDatabaseRefID: externalDatabaseRefID || userId.toString(),
    };

    const ftRes = await axios.post(
      `${FACETEC_BASE_URL}/process-request`,
      ftPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': FACETEC_DEVICE_KEY,
          'X-Testing-API-Header': ftUserAgentString,
        },
        timeout: 20000,
      },
    );

    const responseBlob = ftRes.data?.responseBlob;
    if (!responseBlob) {
      return res
        .status(500)
        .json({
          success: false,
          message: 'FaceTec did not return responseBlob',
        });
    }

    // 2) Update DB (your logic)
    await FaceTec.findOneAndUpdate(
      { userId },
      {
        $set: {
          lastVerificationDate: new Date(),
          lastVerificationStatus: 'PASS',
          consecutiveFailures: 0,
        },
        $push: {
          auditTrail: {
            action: 'VERIFY',
            status: 'PASS',
            sessionId: externalDatabaseRefID || '',
          },
        },
      },
    );

    // 3) Return responseBlob
    return res.json({ success: true, action: 'ALLOW_ACCESS', responseBlob });
  } catch (e) {
    console.error('Verify Error:', e?.response?.data || e.message);
    return res
      .status(500)
      .json({ success: false, message: 'Verification failed' });
  }
};



