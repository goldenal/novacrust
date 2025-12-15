
import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto, FundWalletDto, TransferWalletDto } from './dto/wallet.dto';

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
  async getWallet(@Param('id') id: string) {
    return this.walletService.getWallet(id);
  }
}
