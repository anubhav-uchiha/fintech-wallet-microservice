import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommissionDocument = HydratedDocument<Commission>;

@Schema({ timestamps: true })
export class Commission {
  @Prop({
    required: true,
    unique: true,
    enum: [
      'ADD_MONEY',
      'WITHDRAW',
      'TRANSFER',
      'AEPS_WITHDRAW',
      'AEPS_BALANCE',
      'DMT',
    ],
  })
  serviceType!: string;

  @Prop({
    required: true,
    enum: ['FIXED', 'PERCENTAGE'],
  })
  commissionType!: string;

  @Prop({
    required: true,
  })
  value!: number;

  @Prop({
    default: 0,
  })
  minimum!: number;

  @Prop({
    default: 999999,
  })
  maximum!: number;

  @Prop({
    default: true,
  })
  isActive!: boolean;
}

export const CommissionSchema = SchemaFactory.createForClass(Commission);
