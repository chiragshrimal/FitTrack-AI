import { Schema, model } from 'mongoose';

const squatSchema = new Schema(
  {
    count: { type: Number, required: true },
    duration: { type: String, required: true }, // e.g., "5 min"
    date: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Squat = model('Squat', squatSchema);
export default Squat;
