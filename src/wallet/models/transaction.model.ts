
import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Wallet } from './wallet.model';

export enum TransactionType {
  FUND = 'FUND',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

@Table
export class Transaction extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Wallet)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  walletId: string;

  @BelongsTo(() => Wallet)
  wallet: Wallet;

  @Column({
    type: DataType.ENUM(...Object.values(TransactionType)),
    allowNull: false,
  })
  type: TransactionType;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    validate: {
      min: 1, // Positive integer
    },
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true, // Idempotency key
  })
  reference: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: any;
}
