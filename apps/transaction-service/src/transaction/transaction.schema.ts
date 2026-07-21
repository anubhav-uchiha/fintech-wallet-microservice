import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true, unique: true })
  referenceId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  walletId!: Types.ObjectId;

  @Prop({
    required: true,
    min: 1,
  })
  amount!: number;

  @Prop({
    required: true,
    enum: ['CREDIT', 'DEBIT'],
  })
  type!: string;

  @Prop({
    required: true,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS',
  })
  status!: string;

  @Prop({
    required: true,
  })
  description!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  receiverUserId?: Types.ObjectId;

  @Prop({
    default: false,
  })
  isRollback!: boolean;

  @Prop({
    default: false,
  })
  isReversed!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'Transaction',
    default: null,
  })
  referenceTransactionId?: Types.ObjectId;

  @Prop({
    default: null,
  })
  transferGroupId?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
