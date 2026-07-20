import {Schema, model, Types} from 'mongoose';

const DocumentSchema = new Schema({
    title: {type: String, required: true, default: "Untitled Document"},
    owner: {type: Schema.Types.ObjectId, ref: "User", required: true},
    content: {type: String, default: ""},
    rawState: {type: Buffer, default: null},   
}, {
    timestamps: true
});

export const Document = model('Document', DocumentSchema);