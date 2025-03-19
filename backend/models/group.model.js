import { Schema, model } from 'mongoose';

const groupSchema = new Schema(
  {
    head: { type: Schema.Types.ObjectId, ref: 'Trainer', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const Group = model('Group', groupSchema);
export default Group;
