import { Schema, model } from 'mongoose';

const crunchSchema = new Schema(
  {
    name: { type: String, required: true, default: 'Crunch' },
    count: { type: Number, required: true },
    duration: { type: String, required: true }, // e.g., "5 min"
    date: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Crunch = model('Crunch', crunchSchema);
export default Crunch;
