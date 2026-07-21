import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', unique: true, required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  balance!: number;

  @Prop({
    required: true,
    default: 'INR',
  })
  currency!: string;

  @Prop({
    required: true,
    default: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'FROZEN', 'BLOCKED', 'CLOSED'],
  })
  status!: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
