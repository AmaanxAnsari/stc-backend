/* eslint-disable no-undef */

import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateToken = (payload,expire="1d") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expire });
