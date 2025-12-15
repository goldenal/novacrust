
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet } from './models/wallet.model';
import { Transaction } from './models/transaction.model';

@Module({
  imports: [SequelizeModule.forFeature([Wallet, Transaction])],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}

