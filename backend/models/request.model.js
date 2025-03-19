import { Schema, model } from 'mongoose';

const requestSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'Trainer', required: true },
    to: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  },
  { timestamps: true }
);

const Request = model('Request', requestSchema);
export default Request;
