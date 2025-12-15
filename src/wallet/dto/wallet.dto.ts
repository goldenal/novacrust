
import { IsInt, IsNotEmpty, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class CreateWalletDto {
  // Empty for now as currency defaults to USD
}

export class FundWalletDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reference: string;
}

export class TransferWalletDto {
  @IsUUID()
  @IsNotEmpty()
  fromWalletId: string;

  @IsUUID()
  @IsNotEmpty()
  toWalletId: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reference: string;
}
