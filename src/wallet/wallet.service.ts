
import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction as SequelizeTransaction } from 'sequelize';
import { Wallet } from './models/wallet.model';
import { Transaction, TransactionType } from './models/transaction.model';
import { CreateWalletDto, FundWalletDto, TransferWalletDto } from './dto/wallet.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet)
    private walletModel: typeof Wallet,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    private sequelize: Sequelize,
  ) {}

  async createWallet(createWalletDto: CreateWalletDto): Promise<Wallet> {
    return this.walletModel.create({
      balance: 0,
      currency: 'USD',
    });
  }

  async getWallet(id: string): Promise<any> {
    const wallet = await this.walletModel.findByPk(id, {
      include: [{ model: Transaction, order: [['createdAt', 'DESC']] }],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Convert BigInt balance to number for JSON response ease, 
    // or keep as string if precision > 2^53 is a concern (unlikely for cents in this context)
    // Here we return the raw object but usually we need a transformation interceptor.
    // For simplicity, we'll let NestJS serializer handle it, but BigInt needs explicit handling usually.
    return {
      wallet: {
        id: wallet.id,
        currency: wallet.currency,
        balance: Number(wallet.balance), // Safe for values < 9 quadrillion
      },
      transactions: wallet.transactions,
    };
  }

  async fundWallet(walletId: string, fundWalletDto: FundWalletDto): Promise<any> {
    const { amount, reference } = fundWalletDto;

    // Check if reference exists (Idempotency check #1 - Optimization)
    const existingTx = await this.transactionModel.findOne({ where: { reference } });
    if (existingTx) {
      throw new ConflictException('Duplicate transaction reference');
    }

    const t = await this.sequelize.transaction();

    try {
      // Lock Wallet
      const wallet = await this.walletModel.findByPk(walletId, {
        lock: SequelizeTransaction.LOCK.UPDATE,
        transaction: t,
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Update Balance
      const newBalance = BigInt(wallet.balance) + BigInt(amount);
      await wallet.update({ balance: newBalance }, { transaction: t });

      // Create Transaction Record
      const tx = await this.transactionModel.create(
        {
          walletId: wallet.id,
          type: TransactionType.FUND,
          amount: amount,
          reference: reference,
          metadata: { description: 'Funding wallet' },
        },
        { transaction: t },
      );

      await t.commit();
      return {
        success: true,
        newBalance: Number(newBalance),
        transactionId: tx.id,
      };
    } catch (error) {
      await t.rollback();
      if (error instanceof NotFoundException) throw error;
      if (error.name === 'SequelizeUniqueConstraintError') {
         throw new ConflictException('Duplicate transaction reference');
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async transferFunds(transferDto: TransferWalletDto): Promise<any> {
    const { fromWalletId, toWalletId, amount, reference } = transferDto;

    if (fromWalletId === toWalletId) {
      throw new BadRequestException('Cannot transfer to same wallet');
    }

     // Check if reference exists (Idempotency check #1)
     const existingTx = await this.transactionModel.findOne({ where: { reference } });
     if (existingTx) {
       throw new ConflictException('Duplicate transaction reference');
     }

    const t = await this.sequelize.transaction();

    try {
      // Lock Sender (Ensure consistent ordering to avoid deadlocks normally, 
      // but here we just lock sender first. If bidirectional transfers happen 
      // simultaneously between A and B, deadlock is possible. 
      // Best practice: Lock in ID order.)
      
      const [firstId, secondId] = [fromWalletId, toWalletId].sort();
      
      // We need to fetch both to lock them.
      // This approach prevents deadlocks.
      const wallet1 = await this.walletModel.findByPk(firstId, { lock: SequelizeTransaction.LOCK.UPDATE, transaction: t });
      const wallet2 = await this.walletModel.findByPk(secondId, { lock: SequelizeTransaction.LOCK.UPDATE, transaction: t });

      if (!wallet1 || !wallet2) {
        throw new NotFoundException('One or both wallets not found');
      }

      const sender = firstId === fromWalletId ? wallet1 : wallet2;
      const receiver = firstId === fromWalletId ? wallet2 : wallet1;

      // Check Balance
      const senderBalance = BigInt(sender.balance);
      const amountBig = BigInt(amount);

      if (senderBalance < amountBig) {
        throw new ConflictException('Insufficient wallet balance');
      }

      // Perform updates
      await sender.update({ balance: senderBalance - amountBig }, { transaction: t });
      await receiver.update({ balance: BigInt(receiver.balance) + amountBig }, { transaction: t });

      // Create Transaction Records
      // 1. Sender (TRANSFER_OUT)
      await this.transactionModel.create(
        {
          walletId: sender.id,
          type: TransactionType.TRANSFER_OUT,
          amount: amount,
          reference: reference, // Main reference
          metadata: { toWalletId: receiver.id },
        },
        { transaction: t },
      );

      // 2. Receiver (TRANSFER_IN)
      await this.transactionModel.create(
        {
          walletId: receiver.id,
          type: TransactionType.TRANSFER_IN,
          amount: amount,
          reference: `${reference}_IN`, // Derived reference to satisfy unique constraint if strictly applied per row, or just use a different unique key strategies. 
          // Requirement says "Operation must be idempotent". 
          // Usually a transfer is one atomic operation. 
          // Let's assume we want to track it for the receiver too.
          // Note: references must be unique.
          metadata: { fromWalletId: sender.id, mainReference: reference },
        },
        { transaction: t },
      );

      await t.commit();
      return {
        success: true,
        reference,
      };

    } catch (error) {
      await t.rollback();
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException('Duplicate transaction reference');
     }
      throw new InternalServerErrorException(error.message);
    }
  }
}
