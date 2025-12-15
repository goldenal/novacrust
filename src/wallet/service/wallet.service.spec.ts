
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { WalletService } from './wallet.service';
import { Wallet } from '../models/wallet.model';
import { Transaction } from '../models/transaction.model';
import { Sequelize } from 'sequelize-typescript';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

const mockWallet = {
  id: 'wallet-1',
  balance: 0,
  update: jest.fn(),
  currency: 'USD',
  transactions: [],
};

const mockTransaction = {
  id: 'tx-1',
};

const mockSequelize = {
  transaction: jest.fn().mockImplementation(() => ({
    commit: jest.fn(),
    rollback: jest.fn(),
  })),
};

describe('WalletService', () => {
  let service: WalletService;
  let walletModel: typeof Wallet;
  let transactionModel: typeof Transaction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getModelToken(Wallet),
          useValue: {
            create: jest.fn().mockResolvedValue(mockWallet),
            findByPk: jest.fn().mockResolvedValue(mockWallet),
          },
        },
        {
          provide: getModelToken(Transaction),
          useValue: {
            create: jest.fn().mockResolvedValue(mockTransaction),
            findOne: jest.fn(),
          },
        },
        {
          provide: Sequelize,
          useValue: mockSequelize,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletModel = module.get<typeof Wallet>(getModelToken(Wallet));
    transactionModel = module.get<typeof Transaction>(getModelToken(Transaction));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('should create a wallet with 0 balance', async () => {
      const result = await service.createWallet({});
      expect(result).toEqual(mockWallet);
      expect(walletModel.create).toHaveBeenCalledWith({ balance: 0, currency: 'USD' });
    });
  });

  describe('fundWallet', () => {
    const fundDto = { amount: 1000, reference: 'ref-1' };

    it('should successfully fund a wallet', async () => {
      // Mock findOne (idempotency)
      (transactionModel.findOne as jest.Mock).mockResolvedValue(null);
      
      const updateMock = jest.fn();
      (walletModel.findByPk as jest.Mock).mockResolvedValue({ 
        ...mockWallet, 
        balance: 0,
        update: updateMock,
        id: 'wallet-1'
      });

      const result = await service.fundWallet('wallet-1', fundDto);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1000);
      expect(updateMock).toHaveBeenCalledWith(
        { balance: BigInt(1000) },
        expect.anything()
      );
    });

    it('should throw ConflictException on duplicate reference', async () => {
      (transactionModel.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.fundWallet('wallet-1', fundDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('transferFunds', () => {
    const transferDto = { 
      fromWalletId: 'w1', 
      toWalletId: 'w2', 
      amount: 500, 
      reference: 'ref-tx-1' 
    };

    it('should transfer funds successfully', async () => {
       (transactionModel.findOne as jest.Mock).mockResolvedValue(null);
       
       const senderUpdate = jest.fn();
       const receiverUpdate = jest.fn();

       // We need to verify locking order too, but hard with simple mocks.
       // We'll trust the mock return values.
       (walletModel.findByPk as jest.Mock)
        .mockImplementation(async (id) => {
          if (id === 'w1') return { id: 'w1', balance: 1000, update: senderUpdate };
          if (id === 'w2') return { id: 'w2', balance: 0, update: receiverUpdate };
        });

      await service.transferFunds(transferDto);

      expect(senderUpdate).toHaveBeenCalledWith(
          { balance: BigInt(500) }, // 1000 - 500
          expect.anything()
      );
      expect(receiverUpdate).toHaveBeenCalledWith(
          { balance: BigInt(500) }, // 0 + 500
          expect.anything()
      );
    });

    it('should fail if insufficient balance', async () => {
       (transactionModel.findOne as jest.Mock).mockResolvedValue(null);
       (walletModel.findByPk as jest.Mock).mockImplementation(async (id) => {
          if (id === 'w1') return { id: 'w1', balance: 100, update: jest.fn() }; // Only 100
          if (id === 'w2') return { id: 'w2', balance: 0, update: jest.fn() };
       });

       await expect(service.transferFunds(transferDto)).rejects.toThrow(ConflictException);
    });
  });
});
