import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const trainerSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Trainer name  is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    age: { type: String, required: true },
    height: { type: Number, required: true },
    weight: { type: Number, required:true },
    userType: {
      type: String,
      default: 'trainer',
    },
    gender: { type: String, required: true }
  },
  { timestamps: true }
);

// 🔹 Hash password before saving
trainerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

// 🔹 Instance Methods
trainerSchema.methods = {
  comparePassword: async function (plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
  },

  generateJWTToken: async function () {
    return await jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  },
};

const Trainer = model('Trainer', trainerSchema);
export default Trainer;
