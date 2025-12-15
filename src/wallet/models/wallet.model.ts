
import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { Transaction } from './transaction.model';

@Table
export class Wallet extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    defaultValue: 'USD',
  })
  declare currency: string;

  @Column({
    type: DataType.BIGINT,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0,
    },
  })
  declare balance: number; // In TypeScript we use number or string for BigInt, but Sequelize handles mapping

  @HasMany(() => Transaction)
  transactions: Transaction[];
}
