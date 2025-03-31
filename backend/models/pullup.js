import { Schema, model } from 'mongoose';

const pullUpSchema = new Schema(
  {
    count: { type: Number, required: true },
    duration: { type: String, required: true }, // e.g., "5 min"
    date: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const PullUp = model('PullUp', pullUpSchema);
export default PullUp;
