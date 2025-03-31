import { Schema, model } from 'mongoose';

const pushUpSchema = new Schema(
  {
    name: { type: String, required: true, default: 'PushUp' },
    count: { type: Number, required: true },
    duration: { type: Number, required: true }, // e.g., "5 min"
    date: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const PushUp = model('PushUp', pushUpSchema);
export default PushUp;
