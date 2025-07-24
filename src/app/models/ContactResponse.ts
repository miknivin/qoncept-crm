import mongoose, { Document, Schema, model, Types } from 'mongoose';

// ContactResponse interface
export interface IContactResponse extends Document {
  contact: Types.ObjectId;
  activity:
    | 'HAD_CONVERSATION'
    | 'CALLED_NOT_PICKED'
    | 'CALLED_INVALID'
    | 'CALLED_SWITCHED_OFF'
    | 'WHATSAPP_COMMUNICATED'
    | 'ONLINE_MEETING_SCHEDULED'
    | 'OFFLINE_MEETING_SCHEDULED'
    | 'ONLINE_MEETING_CONFIRMED'
    | 'OFFLINE_MEETING_CONFIRMED'
    | 'PROPOSAL_SHARED'
    | 'PAYMENT_DONE_ADVANCE'
    | 'PAYMENT_DONE_PENDING'
    | 'FULL_PAYMENT_DONE'
    | 'PAYMENT_DONE_MONTHLY'
    | 'OTHER';
  note: string;
  meetingScheduledDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contactResponseSchema = new Schema<IContactResponse>(
  {
    contact: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Contact ID is required'],
      index: true,
    },
    activity: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: [
        'HAD_CONVERSATION',
        'CALLED_NOT_PICKED',
        'CALLED_INVALID',
        'CALLED_SWITCHED_OFF',
        'WHATSAPP_COMMUNICATED',
        'ONLINE_MEETING_SCHEDULED',
        'OFFLINE_MEETING_SCHEDULED',
        'ONLINE_MEETING_CONFIRMED',
        'OFFLINE_MEETING_CONFIRMED',
        'PROPOSAL_SHARED',
        'PAYMENT_DONE_ADVANCE',
        'PAYMENT_DONE_PENDING',
        'FULL_PAYMENT_DONE',
        'PAYMENT_DONE_MONTHLY',
        'OTHER',
      ],
    },
    note: {
      type: String,
      maxLength: [1000, 'Note cannot exceed 1000 characters'],
      default: '',
    },
    meetingScheduledDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

contactResponseSchema.index({ note: 'text' });
contactResponseSchema.index({ activity: 1 });

const ContactResponse = mongoose.models.ContactResponse || model<IContactResponse>('ContactResponse', contactResponseSchema);

export default ContactResponse;