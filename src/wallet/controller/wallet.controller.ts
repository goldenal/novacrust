
import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe, Query } from '@nestjs/common';
import { WalletService } from '../service/wallet.service';
import { CreateWalletDto, FundWalletDto, TransferWalletDto } from '../dto/wallet.dto';

@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    return this.walletService.createWallet(createWalletDto);
  }

  @Post(':id/fund')
  async fundWallet(
    @Param('id') id: string,
    @Body() fundWalletDto: FundWalletDto,
  ) {
    return this.walletService.fundWallet(id, fundWalletDto);
  }

  @Post('transfer')
  async transferFunds(@Body() transferDto: TransferWalletDto) {
    return this.walletService.transferFunds(transferDto);
  }

  @Get(':id')
  async getWallet(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.walletService.getWallet(id, page, limit);
  }
}
